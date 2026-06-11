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
$productId = trim((string) ($body['productId'] ?? ($body['product_id'] ?? '')));
$purchaseToken = trim((string) ($body['purchaseToken'] ?? ($body['purchase_token'] ?? '')));

if (!$productId || !$purchaseToken) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'productId et purchaseToken requis']);
    exit;
}

try {
    $verifier = new GoogleIapVerifier($ctx['iapConfig']);
    $verified = $verifier->verifySubscription($productId, $purchaseToken);

    $expectedProduct = $ctx['iapConfig']['product_id'] ?? 'cary.pro.monthly';
    if ($verified['product_id'] && $verified['product_id'] !== $expectedProduct) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Produit IAP non reconnu']);
        exit;
    }

    $row = $service->upsertStoreSubscription(
        $userId,
        'google',
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
    error_log('iap/google/verify: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Validation Google Play échouée']);
}
