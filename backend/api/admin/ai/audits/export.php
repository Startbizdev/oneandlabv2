<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../../config/cors.php';
require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiAdminService.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$auth = new AuthMiddleware();
$user = $auth->handle();
(new RoleMiddleware())->handle($user, ['super_admin']);

$days = isset($_GET['days']) ? max(1, min(90, (int) $_GET['days'])) : 30;
$service = new AiAdminService();
$csv = $service->exportAuditsCsv($days);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="ai_audits_' . date('Y-m-d') . '.csv"');
echo $csv;
