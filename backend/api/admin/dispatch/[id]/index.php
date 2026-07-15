<?php

/**
 * API Admin — Détail dispatch 360° d'un rendez-vous
 * GET: Timeline, offres, acteurs (super_admin uniquement)
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../../config/cors.php';
require_once __DIR__ . '/../../../../lib/admin/AdminDispatchService.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
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

$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/'));
$dispatchIdx = array_search('dispatch', $pathParts, true);
$appointmentId = ($dispatchIdx !== false && isset($pathParts[$dispatchIdx + 1]))
    ? $pathParts[$dispatchIdx + 1]
    : null;

if (!$appointmentId || !preg_match('/^[0-9a-f-]{36}$/i', $appointmentId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID rendez-vous invalide']);
    exit;
}

try {
    $service = new AdminDispatchService();
    $data = $service->getDetail($appointmentId, $user['user_id']);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $e) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('admin/dispatch detail: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur'], JSON_UNESCAPED_UNICODE);
}
