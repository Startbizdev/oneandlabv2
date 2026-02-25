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
\Stripe\Stripe::setApiKey($stripeConfig['secret_key']);

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

if ($type === 'customer.subscription.deleted') {
    $subId = $object->id;
    $stmt = $pdo->prepare('UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE stripe_subscription_id = ?');
    $stmt->execute(['canceled', $subId]);
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
    } else {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $stmt = $pdo->prepare('INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, price_id, plan_slug, status, trial_ends_at, current_period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
        $stmt->execute([$id, $userId, $customerId, $subId, $priceId, $planSlug, $status, $trialEndDt, $periodEndDt]);
    }
}

echo json_encode(['received' => true]);
