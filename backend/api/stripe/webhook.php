<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/stripe.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$stripeConfig = require __DIR__ . '/../../config/stripe.php';
$webhookSecret = $stripeConfig['webhook_secret'] ?? '';
if ($webhookSecret === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Webhook secret not configured']);
    exit;
}

$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../lib/PatientUrgencyConfig.php';
require_once __DIR__ . '/../../lib/PatientBookingDraftExecutor.php';

try {
    $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payload']);
    exit;
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid signature']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$type = $event->type;
$object = $event->data->object;

if ($type === 'checkout.session.completed') {
    /** @var \Stripe\Checkout\Session $object */
    $session = $object;
    $paymentMode = (string) ($session->mode ?? '');
    $metaPayload = [];
    try {
        if (!empty($session->metadata)) {
            $decoded = json_decode(json_encode($session->metadata), true);
            $metaPayload = is_array($decoded) ? $decoded : [];
        }
    } catch (Throwable $e) {
        error_log('Stripe webhook checkout metadata decode: ' . $e->getMessage());
        $metaPayload = [];
    }
    if (
        $paymentMode === 'payment'
        && ($metaPayload['checkout_kind'] ?? '') === PatientUrgencyConfig::CHECKOUT_METADATA_KIND
    ) {
        $draftId = (string) ($metaPayload['draft_id'] ?? '');
        $uidMeta = (string) ($metaPayload['user_id'] ?? '');
        if ($draftId === '' || $uidMeta === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Draft metadata invalide']);
            exit;
        }
        $payStatus = (string) ($session->payment_status ?? '');
        $amountTotal = (int) ($session->amount_total ?? 0);
        if ($payStatus !== 'paid' || $amountTotal < PatientUrgencyConfig::URGENCY_AMOUNT_CENTS) {
            echo json_encode(['received' => true, 'ignored' => true, 'reason' => 'payment_incomplete']);
            exit;
        }
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT * FROM patient_booking_drafts WHERE id = ? FOR UPDATE');
            $stmt->execute([$draftId]);
            $draft = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$draft) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Draft inexistant']);
                exit;
            }
            if (($draft['stripe_checkout_session_id'] ?? '') !== (string) $session->id) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'session_id discordant']);
                exit;
            }
            if (($draft['user_id'] ?? '') !== $uidMeta) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'user discordant']);
                exit;
            }
            if (($draft['status'] ?? '') === 'completed') {
                $pdo->commit();
                echo json_encode(['received' => true]);
                exit;
            }
            if (($draft['status'] ?? '') !== 'pending_payment' && ($draft['status'] ?? '') !== 'paid_processing') {
                $pdo->rollBack();
                echo json_encode(['received' => true, 'skipped' => true]);
                exit;
            }
            if (($draft['status'] ?? '') === 'pending_payment') {
                $u = $pdo->prepare('UPDATE patient_booking_drafts SET status = ? WHERE id = ? AND status = ?');
                $u->execute(['paid_processing', $draftId, 'pending_payment']);
                if ($u->rowCount() === 0) {
                    $pdo->rollBack();
                    echo json_encode(['received' => true, 'skipped' => true]);
                    exit;
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('patient_booking_draft_lock: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'lock_failed']);
            exit;
        }

        try {
            $createdIds = PatientBookingDraftExecutor::run($pdo, $draft + ['stripe_checkout_session_id' => (string) $session->id]);
            $pdo->prepare(
                'UPDATE patient_booking_drafts SET status = ?, completed_at = NOW(), created_appointment_ids_json = ?, error_message = NULL WHERE id = ?'
            )->execute(['completed', json_encode($createdIds), $draftId]);
            try {
                require_once __DIR__ . '/../../lib/AdminEmailNotifier.php';
                require_once __DIR__ . '/../../models/User.php';
                $amountEur = $amountTotal / 100;
                AdminEmailNotifier::vipPayment($uidMeta, $amountEur, count($createdIds), 'Stripe');
            } catch (Throwable $adminMailErr) {
                error_log('stripe webhook VIP admin email: ' . $adminMailErr->getMessage());
            }
            $dir = dirname(__DIR__, 2) . '/storage/patient-booking-drafts/' . $draft['storage_subdir'];
            if (is_dir($dir)) {
                foreach (glob($dir . '/*') ?: [] as $f) {
                    @unlink($f);
                }
                @rmdir($dir);
            }
            echo json_encode(['received' => true]);
            exit;
        } catch (Throwable $e) {
            error_log('patient_booking_draft_finalize: ' . $e->getMessage());
            $pdo->prepare('UPDATE patient_booking_drafts SET status = ?, error_message = ? WHERE id = ?')->execute([
                'failed',
                substr((string) $e->getMessage(), 0, 2000),
                $draftId,
            ]);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'finalize_failed']);
            exit;
        }
    }
    echo json_encode(['received' => true]);
    exit;
}

if ($type === 'customer.subscription.deleted') {
    $subId = $object->id;
    $userId = $object->metadata->user_id ?? null;
    $planSlug = $object->metadata->plan_slug ?? null;
    if (!$userId) {
        $stmt = $pdo->prepare('SELECT user_id, plan_slug FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1');
        $stmt->execute([$subId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $row['user_id'] ?? null;
        $planSlug = $planSlug ?: ($row['plan_slug'] ?? null);
    }
    $stmt = $pdo->prepare('UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE stripe_subscription_id = ?');
    $stmt->execute(['canceled', $subId]);
    if ($userId) {
        try {
            require_once __DIR__ . '/../../lib/AdminEmailNotifier.php';
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $profile = $userModel->getById((string) $userId, 'system', 'system');
            $userEmail = is_array($profile) ? ($profile['email'] ?? null) : null;
            AdminEmailNotifier::stripeSubscriptionEnded((string) $userId, $planSlug, $userEmail);
        } catch (Throwable $adminMailErr) {
            error_log('stripe webhook subscription deleted admin email: ' . $adminMailErr->getMessage());
        }
    }
    echo json_encode(['received' => true]);
    exit;
}

if ($type === 'customer.subscription.created' || $type === 'customer.subscription.updated') {
    $subId = $object->id;
    $customerId = $object->customer ?? null;
    $status = $object->status ?? 'incomplete';
    $trialEnd = $object->trial_end ?? null;
    $currentPeriodEnd = $object->current_period_end ?? null;
    $items = $object->items->data ?? [];
    $priceId = null;
    if (!empty($items)) {
        $priceId = $items[0]->price->id ?? null;
    }

    $userId = $object->metadata->user_id ?? null;
    if (!$userId && $customerId) {
        $stmt = $pdo->prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1');
        $stmt->execute([$customerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $row['user_id'] ?? null;
    }
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'user_id not found in metadata or existing subscription']);
        exit;
    }

    $planSlug = $object->metadata->plan_slug ?? null;
    if (!$planSlug && $priceId) {
        $prices = $stripeConfig['prices'] ?? [];
        foreach ($prices as $slug => $pid) {
            if ($pid === $priceId) {
                $planSlug = $slug;
                break;
            }
        }
    }

    $trialEndDt = $trialEnd ? date('Y-m-d H:i:s', $trialEnd) : null;
    $periodEndDt = $currentPeriodEnd ? date('Y-m-d H:i:s', $currentPeriodEnd) : null;

    $stmt = $pdo->prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1');
    $stmt->execute([$subId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $stmt = $pdo->prepare('UPDATE subscriptions SET stripe_customer_id = ?, price_id = ?, plan_slug = ?, status = ?, trial_ends_at = ?, current_period_end = ?, updated_at = NOW() WHERE stripe_subscription_id = ?');
        $stmt->execute([$customerId, $priceId, $planSlug, $status, $trialEndDt, $periodEndDt, $subId]);
        if ($type === 'customer.subscription.updated' && in_array($status, ['past_due', 'unpaid', 'canceled', 'incomplete_expired'], true)) {
            try {
                require_once __DIR__ . '/../../lib/AdminEmailNotifier.php';
                require_once __DIR__ . '/../../models/User.php';
                $userModel = new User();
                $profile = $userModel->getById((string) $userId, 'system', 'system');
                $userEmail = is_array($profile) ? ($profile['email'] ?? null) : null;
                AdminEmailNotifier::stripeSubscriptionStatusChanged((string) $userId, $planSlug, (string) $status, $userEmail);
            } catch (Throwable $adminMailErr) {
                error_log('stripe webhook subscription updated admin email: ' . $adminMailErr->getMessage());
            }
        }
    } else {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $stmt = $pdo->prepare('INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, price_id, plan_slug, status, trial_ends_at, current_period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
        $stmt->execute([$id, $userId, $customerId, $subId, $priceId, $planSlug, $status, $trialEndDt, $periodEndDt]);

        if ($type === 'customer.subscription.created') {
            try {
                require_once __DIR__ . '/../../lib/AdminEmailNotifier.php';
                require_once __DIR__ . '/../../models/User.php';
                $userModel = new User();
                $profile = $userModel->getById((string) $userId, 'system', 'system');
                $userEmail = is_array($profile) ? ($profile['email'] ?? null) : null;
                AdminEmailNotifier::stripeSubscription($type, (string) $userId, $planSlug, (string) $status, $userEmail);
            } catch (Throwable $adminMailErr) {
                error_log('stripe webhook subscription admin email: ' . $adminMailErr->getMessage());
            }
        }
    }
}

echo json_encode(['received' => true]);
