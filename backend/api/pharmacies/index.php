<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';

[$user, $db, $moduleConfig, $orderService, $catalogService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$config = $moduleConfig->getConfig();
if (!PharmacyModuleConfig::canOrder($user, $config) && !PharmacyModuleConfig::canReceive($user, $config)
    && ($user['role'] ?? '') !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Module non disponible']);
    exit;
}

$postalCode = isset($_GET['postal_code']) ? trim((string) $_GET['postal_code']) : null;
$mode = isset($_GET['fulfillment_mode']) ? trim((string) $_GET['fulfillment_mode']) : null;
$favoriteUserId = PharmacyModuleConfig::canOrder($user, $config)
    ? (string) ($user['user_id'] ?? '')
    : null;

$items = $catalogService->listPharmacies($postalCode, $mode, $favoriteUserId);
echo json_encode(['success' => true, 'data' => $items]);
