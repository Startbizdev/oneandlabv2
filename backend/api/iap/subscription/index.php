<?php

header('Content-Type: application/json');
require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    $ctx = iapBootstrap();
    $authUser = iapRequireNurseAuth();
    $userId = $authUser['user_id'];

    /** @var SubscriptionService $service */
    $service = $ctx['subscriptionService'];

    $latest = $service->getLatestSubscription($userId);
    $activePlan = $service->getActiveNursePlan($userId);
    $data = $service->formatMobileSubscription($latest, $activePlan);
    $data['can_purchase_store'] = $service->canPurchaseStorePro($userId)['allowed'];
    $data['product_id'] = $ctx['iapConfig']['product_id'] ?? 'cary.pro.monthly';

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Throwable $e) {
    error_log('iap/subscription: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Abonnement indisponible']);
}
