<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';

[$user, $db, $moduleConfig, $orderService, $catalogService, $favoriteService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$config = $moduleConfig->getConfig();
if (!PharmacyModuleConfig::canOrder($user, $config)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$uid = (string) ($user['user_id'] ?? '');
$ids = $favoriteService->listPharmacyIds($uid);
echo json_encode(['success' => true, 'data' => ['pharmacy_ids' => $ids]]);
