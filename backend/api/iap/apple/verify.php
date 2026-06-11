<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$ctx = iapBootstrap();
$authUser = iapRequireNurseAuth();
$userId = $authUser['user_id'];

/** @var SubscriptionService $service */
$service = $ctx['subscriptionService'];
$can = $service->canPurchaseStorePro($userId);
if (!$can['allowed']) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => $can['error']]);
    exit;
}

$body = iapReadJsonBody();
$transactionId = trim((string) ($body['transactionId'] ?? ''));
$signedTransaction = trim((string) ($body['signedTransaction'] ?? ($body['signed_transaction'] ?? '')));

if (!$transactionId && !$signedTransaction) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'transactionId ou signedTransaction requis']);
    exit;
}

if (!$transactionId && $signedTransaction) {
    $decoded = IapJwtHelper::decodeJwsPayload($signedTransaction);
    $transactionId = (string) ($decoded['transactionId'] ?? ($decoded['originalTransactionId'] ?? ''));
}

try {
    $verifier = new AppleIapVerifier($ctx['iapConfig']);
    $verified = $verifier->verifyPurchase($transactionId, $signedTransaction ?: null);

    $expectedProduct = $ctx['iapConfig']['product_id'] ?? 'cary.pro.monthly';
    if ($verified['product_id'] && $verified['product_id'] !== $expectedProduct) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Produit IAP non reconnu']);
        exit;
    }

    $row = $service->upsertStoreSubscription(
        $userId,
        'apple',
        $verified['product_id'] ?: $expectedProduct,
        $verified['original_transaction_id'],
        $verified['status'],
        $verified['trial_ends_at'],
        $verified['current_period_end']
    );

    echo json_encode([
        'success' => true,
        'data' => $service->formatMobileSubscription($row, 'nurse_pro'),
    ]);
} catch (Throwable $e) {
    error_log('iap/apple/verify: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Validation Apple échouée']);
}
