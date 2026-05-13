<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/CareCategoryImage.php';
$corsConfig = require __DIR__ . '/../../config/cors.php';
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (($user['role'] ?? '') !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

CSRFMiddleware::handle();

$backendRoot = realpath(__DIR__ . '/../..');
if ($backendRoot === false) {
    $backendRoot = __DIR__ . '/../..';
}

$categoryId = isset($_POST['category_id']) ? trim((string) $_POST['category_id']) : '';
$fileStem = CareCategoryImage::storageStemFromCategoryId($categoryId);
if ($fileStem === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'category_id invalide']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Fichier requis ou erreur d\'upload']);
    exit;
}

$file = $_FILES['file'];
$maxBytes = min(2 * 1024 * 1024, defined('ONEANDLAB_MAX_UPLOAD_BYTES') ? (int) ONEANDLAB_MAX_UPLOAD_BYTES : 2 * 1024 * 1024);
if ($file['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Image trop volumineuse (max 2 Mo)']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
$extMap = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];
if (!isset($extMap[$mimeType])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Formats acceptés : JPEG, PNG, WebP, GIF']);
    exit;
}
$ext = $extMap[$mimeType];

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$colStmt = $db->query("SHOW COLUMNS FROM care_categories LIKE 'image_url'");
if (!$colStmt || $colStmt->rowCount() === 0) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Colonne image_url absente : exécutez la migration 057']);
    exit;
}

$stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ?');
$stmt->execute([$categoryId]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Catégorie introuvable']);
    exit;
}

try {
    $uploadDir = CareCategoryImage::ensureUploadDir($backendRoot);
    CareCategoryImage::deleteAllForCategory($backendRoot, $categoryId);

    $basename = $fileStem . '.' . $ext;
    $dest = $uploadDir . DIRECTORY_SEPARATOR . $basename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Échec enregistrement fichier');
    }

    $publicPath = CareCategoryImage::publicPathForBasename($basename);
    $upd = $db->prepare('UPDATE care_categories SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    $upd->execute([$publicPath, $categoryId]);

    $logger = new Logger();
    $logger->log($user['user_id'], $user['role'], 'update', 'care_category_image', $categoryId, ['image_url' => $publicPath]);

    echo json_encode([
        'success' => true,
        'data' => [
            'image_url' => $publicPath,
            'category_id' => $categoryId,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
