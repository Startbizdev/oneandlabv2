<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/Validation.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/PatientUrgencyConfig.php';
require_once __DIR__ . '/../../../lib/PatientBookingDraftExecutor.php';
require_once __DIR__ . '/../../../lib/AppleIapVerifier.php';
require_once __DIR__ . '/../../../lib/GoogleIapVerifier.php';
require_once __DIR__ . '/../../../lib/IapJwtHelper.php';
require_once __DIR__ . '/../../iap/_bootstrap.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0 || strpos($origin, 'http://127.0.0.1:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

CSRFMiddleware::handle();

$ctx = iapBootstrap();
$authUser = iapRequirePatientAuth();
$uid = $authUser['user_id'];
$iapConfig = $ctx['iapConfig'];
$expectedProduct = trim((string) ($iapConfig['patient_vip_product_id'] ?? 'cary.patient.blood.vip'));

$body = iapReadJsonBody();
$draftId = trim((string) ($body['draft_id'] ?? ''));
$platform = trim((string) ($body['platform'] ?? ''));
if ($draftId === '' || !Validation::uuid($draftId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'draft_id invalide']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $db->prepare('SELECT * FROM patient_booking_drafts WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE');
$db->beginTransaction();
try {
    $stmt->execute([$draftId, $uid]);
    $draft = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$draft) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Brouillon introuvable']);
        exit;
    }

    $status = (string) ($draft['status'] ?? '');
    if ($status === 'completed') {
        $ids = json_decode((string) ($draft['created_appointment_ids_json'] ?? ''), true);
        $db->commit();
        echo json_encode([
            'success' => true,
            'data' => [
                'status' => 'completed',
                'appointment_ids' => is_array($ids) ? array_values(array_map('strval', $ids)) : [],
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($status !== 'pending_payment') {
        $db->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Brouillon non payable']);
        exit;
    }

    if (!empty($draft['expires_at']) && strtotime((string) $draft['expires_at']) < time()) {
        $db->prepare("UPDATE patient_booking_drafts SET status = 'expired' WHERE id = ?")->execute([$draftId]);
        $db->commit();
        http_response_code(410);
        echo json_encode(['success' => false, 'error' => 'Brouillon expiré']);
        exit;
    }

    $transactionId = '';
    $productId = $expectedProduct;
    $paymentProvider = '';

    if ($platform === 'ios' || $platform === 'apple') {
        $transactionId = trim((string) ($body['transactionId'] ?? ($body['transaction_id'] ?? '')));
        $signedTransaction = trim((string) ($body['signedTransaction'] ?? ($body['signed_transaction'] ?? '')));
        if (!$transactionId && $signedTransaction) {
            $decoded = IapJwtHelper::decodeJwsPayload($signedTransaction);
            $transactionId = (string) ($decoded['transactionId'] ?? ($decoded['originalTransactionId'] ?? ''));
        }
        if ($transactionId === '') {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'transactionId requis']);
            exit;
        }
        $verifier = new AppleIapVerifier($iapConfig);
        $verified = $verifier->verifyPurchase($transactionId, $signedTransaction ?: null);
        if (!empty($verified['product_id']) && empty($iapConfig['allow_unverified']) && $verified['product_id'] !== $expectedProduct) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Produit IAP non reconnu']);
            exit;
        }
        $productId = $verified['product_id'] ?: $expectedProduct;
        $paymentProvider = 'apple';
        $transactionId = (string) ($verified['original_transaction_id'] ?? $transactionId);
    } elseif ($platform === 'android' || $platform === 'google') {
        $productId = trim((string) ($body['productId'] ?? ($body['product_id'] ?? $expectedProduct)));
        $purchaseToken = trim((string) ($body['purchaseToken'] ?? ($body['purchase_token'] ?? '')));
        if ($productId === '' || $purchaseToken === '') {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'productId et purchaseToken requis']);
            exit;
        }
        if ($productId !== $expectedProduct) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Produit IAP non reconnu']);
            exit;
        }
        $verifier = new GoogleIapVerifier($iapConfig);
        $verified = $verifier->verifyProduct($productId, $purchaseToken);
        $paymentProvider = 'google';
        $transactionId = (string) ($verified['original_transaction_id'] ?? $purchaseToken);
    } else {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'platform invalide (ios|android)']);
        exit;
    }

    $dup = $db->prepare(
        'SELECT id FROM patient_booking_drafts WHERE stripe_checkout_session_id = ? AND status = ? AND id <> ? LIMIT 1'
    );
    $dup->execute([$transactionId, 'completed', $draftId]);
    if ($dup->fetch(PDO::FETCH_ASSOC)) {
        $db->rollBack();
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Transaction déjà utilisée']);
        exit;
    }

    $db->prepare(
        "UPDATE patient_booking_drafts SET status = 'paid_processing', stripe_checkout_session_id = ?, payment_provider = ?, iap_product_id = ? WHERE id = ?"
    )->execute([$transactionId, $paymentProvider, $productId, $draftId]);

    $draft['stripe_checkout_session_id'] = $transactionId;
    $draft['payment_provider'] = $paymentProvider;
    $draft['iap_product_id'] = $productId;
    $draft['status'] = 'paid_processing';

    $createdIds = PatientBookingDraftExecutor::run($db, $draft);

    $db->prepare(
        "UPDATE patient_booking_drafts SET status = 'completed', created_appointment_ids_json = ?, completed_at = NOW() WHERE id = ?"
    )->execute([json_encode($createdIds, JSON_UNESCAPED_UNICODE), $draftId]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'data' => [
            'status' => 'completed',
            'appointment_ids' => $createdIds,
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    try {
        $db->prepare(
            "UPDATE patient_booking_drafts SET status = 'failed', error_message = ? WHERE id = ? AND status IN ('pending_payment','paid_processing')"
        )->execute([substr($e->getMessage(), 0, 500), $draftId]);
    } catch (Throwable $ignored) {
    }
    error_log('patient/booking-draft/iap-complete: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Finalisation IAP échouée']);
}
