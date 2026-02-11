<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/User.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$pathParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$idIndex = array_search('coverage-zones', $pathParts);
$id = $pathParts[$idIndex + 1] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID manquant']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$isAdmin = $user['role'] === 'super_admin';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('SELECT * FROM coverage_zones WHERE id = ?');
    $stmt->execute([$id]);
    $zone = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$zone) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Zone non trouvée']);
        exit;
    }
    if (isset($zone['zone_metadata']) && $zone['zone_metadata']) {
        $zone['zone_metadata'] = json_decode($zone['zone_metadata'], true);
    }
    if ($isAdmin) {
        $userModel = new User();
        $owner = $userModel->getById($zone['owner_id'], $user['user_id'], $user['role']);
        $zone['owner_first_name'] = $owner['first_name'] ?? '';
        $zone['owner_last_name'] = $owner['last_name'] ?? '';
        $addr = $owner['address'] ?? null;
        $zone['owner_address_label'] = is_array($addr) && isset($addr['label']) ? $addr['label'] : (is_string($addr) ? $addr : '');
    }
    echo json_encode(['success' => true, 'data' => $zone]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $roleMiddleware = new RoleMiddleware();
    $roleMiddleware->handle($user, ['super_admin']);
    CSRFMiddleware::handle();

    $stmt = $db->prepare('SELECT * FROM coverage_zones WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Zone non trouvée']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $centerLat = array_key_exists('center_lat', $input) ? (float) $input['center_lat'] : (float) $existing['center_lat'];
    $centerLng = array_key_exists('center_lng', $input) ? (float) $input['center_lng'] : (float) $existing['center_lng'];
    $radiusKm = array_key_exists('radius_km', $input) ? (float) $input['radius_km'] : (float) $existing['radius_km'];
    $isActive = !array_key_exists('is_active', $input) ? (bool) $existing['is_active'] : ($input['is_active'] === true || $input['is_active'] === 1 || $input['is_active'] === '1');

    try {
        $stmt = $db->prepare('
            UPDATE coverage_zones 
            SET center_lat = ?, center_lng = ?, radius_km = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$centerLat, $centerLng, $radiusKm, $isActive ? 1 : 0, $id]);
        echo json_encode(['success' => true, 'data' => ['id' => $id]]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $roleMiddleware = new RoleMiddleware();
    $roleMiddleware->handle($user, ['super_admin']);
    CSRFMiddleware::handle();

    try {
        $stmt = $db->prepare('DELETE FROM coverage_zones WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Zone non trouvée']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
