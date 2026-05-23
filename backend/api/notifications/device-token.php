<?php

header('Content-Type: application/json');

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../lib/PushDeviceTokenService.php';

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$userId = (string) ($user['user_id'] ?? '');

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}

$tokenService = new PushDeviceTokenService();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();

    $token = trim((string) ($input['token'] ?? ''));
    $platform = trim((string) ($input['platform'] ?? 'ios'));

    if ($token === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token requis', 'code' => 'VALIDATION_ERROR']);
        exit;
    }

    try {
        $tokenService->upsert($userId, $token, $platform);
        echo json_encode(['success' => true]);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => 'VALIDATION_ERROR']);
    } catch (Throwable $e) {
        error_log('device-token POST: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Enregistrement impossible', 'code' => 'SERVER_ERROR']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    CSRFMiddleware::handle();

    $token = trim((string) ($input['token'] ?? ''));
    if ($token !== '') {
        $tokenService->removeTokenForUser($userId, $token);
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
