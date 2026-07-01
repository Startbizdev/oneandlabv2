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
header('Access-Control-Allow-Methods: GET, PATCH, OPTIONS');
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
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'data' => $service->listRouting()]);
    exit;
}

if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body) || empty($body['task_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'task_type requis']);
        exit;
    }
    $service->updateRouting(
        (string) $body['task_type'],
        (string) ($body['provider'] ?? 'grok'),
        isset($body['model']) ? (string) $body['model'] : null,
        (bool) ($body['enabled'] ?? true),
    );
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'data' => $service->listRouting()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
