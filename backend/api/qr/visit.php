<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/QrCodeService.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}
$token = trim((string) ($input['token'] ?? ''));
$sessionId = isset($input['session_id']) ? trim((string) $input['session_id']) : null;

if ($token === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'token requis']);
    exit;
}

try {
    $service = new QrCodeService();
    $visitId = $service->recordVisit($token, $sessionId !== '' ? $sessionId : null);
    echo json_encode(['success' => true, 'data' => ['visit_id' => $visitId]]);
} catch (RuntimeException $e) {
    $code = (int) $e->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 404;
    }
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('qr/visit: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
