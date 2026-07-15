<?php

/**
 * API Admin — Tableau de bord dispatch (liste + KPIs)
 * GET: Liste paginée des RDV avec métadonnées dispatch (super_admin uniquement)
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/admin/AdminDispatchService.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = min(100, max(1, (int) ($_GET['limit'] ?? 25)));

$filters = array_filter([
    'type' => $_GET['type'] ?? null,
    'status' => $_GET['status'] ?? null,
    'dispatch_mode' => $_GET['dispatch_mode'] ?? null,
    'date_from' => $_GET['date_from'] ?? null,
    'date_to' => $_GET['date_to'] ?? null,
    'created_from' => $_GET['created_from'] ?? null,
    'created_to' => $_GET['created_to'] ?? null,
    'search' => $_GET['search'] ?? null,
], static fn($v) => $v !== null && $v !== '');

try {
    $service = new AdminDispatchService();
    $data = $service->listDashboard($filters, $user['user_id'], $page, $limit);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('admin/dispatch list: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur'], JSON_UNESCAPED_UNICODE);
}
