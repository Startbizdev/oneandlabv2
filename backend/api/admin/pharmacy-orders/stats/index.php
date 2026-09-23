<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../pharmacy/_helpers.php';

[$user, $db, $moduleConfig, $orderService, $catalogService, $favoriteService, $statsService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);
(new RoleMiddleware())->handle($user, ['super_admin']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$from = isset($_GET['from']) ? trim((string) $_GET['from']) : null;
$to = isset($_GET['to']) ? trim((string) $_GET['to']) : null;
echo json_encode(['success' => true, 'data' => $statsService->adminStats($from, $to)]);
