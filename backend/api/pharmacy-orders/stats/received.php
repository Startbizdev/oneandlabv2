<?php

declare(strict_types=1);

require_once __DIR__ . '/../../pharmacy/_helpers.php';

[$user, $db, $moduleConfig, $orderService, $catalogService, $favoriteService, $statsService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

$config = $moduleConfig->getConfig();
if (!PharmacyModuleConfig::canReceive($user, $config)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$from = isset($_GET['from']) ? trim((string) $_GET['from']) : null;
$to = isset($_GET['to']) ? trim((string) $_GET['to']) : null;
$uid = (string) ($user['user_id'] ?? '');
echo json_encode(['success' => true, 'data' => $statsService->pharmacyReceivedStats($uid, $from, $to)]);
