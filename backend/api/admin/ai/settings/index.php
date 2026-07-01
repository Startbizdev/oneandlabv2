<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../../config/cors.php';
require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiAdminService.php';

header('Content-Type: application/json; charset=utf-8');
$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$auth = new AuthMiddleware();
$user = $auth->handle();
(new RoleMiddleware())->handle($user, ['super_admin']);

$service = new AiAdminService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    echo json_encode(['success' => true, 'data' => $service->getSettings()]);
    exit;
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON invalide']);
        exit;
    }
    $service->updateSettings(
        isset($body['disclaimer_fr']) ? (string) $body['disclaimer_fr'] : null,
        isset($body['temperature']) ? (float) $body['temperature'] : null,
    );
    echo json_encode(['success' => true, 'data' => $service->getSettings()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
