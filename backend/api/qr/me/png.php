<?php

require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../lib/QrCodeService.php';
require_once __DIR__ . '/../../../lib/QrPosterRenderer.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['nurse', 'lab', 'subaccount', 'pro']);

$format = QrPosterRenderer::normalizeFormat(trim((string) ($_GET['format'] ?? 'a4')));
$raw = isset($_GET['raw']) && in_array(strtolower((string) $_GET['raw']), ['1', 'true', 'yes'], true);

try {
    $service = new QrCodeService();
    $bytes = $service->renderPngForProfile((string) $user['user_id'], $format, $raw);
    header('Content-Type: image/png');
    header('Content-Disposition: inline; filename="cary-qr.png"');
    header('Cache-Control: private, max-age=60');
    echo $bytes;
} catch (Throwable $e) {
    error_log('qr/me/png: ' . $e->getMessage());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur génération image']);
}
