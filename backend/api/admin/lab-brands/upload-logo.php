<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/LabBrandLogoStorage.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}
CSRFMiddleware::handle();

$backendRoot = realpath(__DIR__ . '/../../..') ?: __DIR__ . '/../../..';
$appConfig = require __DIR__ . '/../../../config/app.php';

try {
    $logoUrl = LabBrandLogoStorage::store(
        $backendRoot,
        (string) $appConfig['site_url'],
        is_array($_FILES['file'] ?? null) ? $_FILES['file'] : ['error' => UPLOAD_ERR_NO_FILE, 'size' => 0, 'tmp_name' => ''],
        'move_uploaded_file'
    );
    (new Logger())->log($user['user_id'], $user['role'], 'upload', 'lab_brand_logo', null, ['logo_url' => $logoUrl]);
    echo json_encode(['success' => true, 'data' => ['logo_url' => $logoUrl]]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('admin/lab-brands/upload-logo POST: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Le logo n’a pas pu être enregistré. Réessayez.']);
}
