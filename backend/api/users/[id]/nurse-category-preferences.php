<?php
/**
 * Admin : GET/PUT des préférences de soins (catégories) d'un infirmier par son ID.
 * GET /users/:id/nurse-category-preferences
 * PUT /users/:id/nurse-category-preferences body: { preferences: [{ category_id, is_enabled }] }
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../lib/Logger.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$auth = new AuthMiddleware();
$user = $auth->handle();
$roleMw = new RoleMiddleware();
$roleMw->handle($user, ['super_admin']);

$nurseId = $_GET['id'] ?? null;
if (!$nurseId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$logger = new Logger();

// Vérifier que l'utilisateur est bien infirmier
$stmt = $db->prepare('SELECT id, role FROM profiles WHERE id = ?');
$stmt->execute([$nurseId]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$profile || $profile['role'] !== 'nurse') {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Infirmier introuvable']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $db->prepare('
            SELECT ncp.id, ncp.category_id, ncp.is_enabled, cc.name, cc.description, cc.type
            FROM nurse_category_preferences ncp
            JOIN care_categories cc ON ncp.category_id = cc.id
            WHERE ncp.nurse_id = ? AND cc.is_active = TRUE
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$nurseId]);
        $preferences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare('
            SELECT cc.id as category_id, cc.name, cc.description, cc.type, TRUE as is_enabled
            FROM care_categories cc
            WHERE cc.is_active = TRUE
            AND cc.id NOT IN (SELECT category_id FROM nurse_category_preferences WHERE nurse_id = ?)
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$nurseId]);
        $defaults = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => array_merge($preferences, $defaults)]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    CSRFMiddleware::handle();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $preferences = $input['preferences'] ?? [];
    if (!is_array($preferences)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'preferences doit être un tableau']);
        exit;
    }
    try {
        foreach ($preferences as $pref) {
            $catId = $pref['category_id'] ?? null;
            $enabled = (bool) ($pref['is_enabled'] ?? true);
            if (!$catId) continue;
            $stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ? AND is_active = TRUE');
            $stmt->execute([$catId]);
            if (!$stmt->fetch()) continue;
            $stmt = $db->prepare('
                INSERT INTO nurse_category_preferences (id, nurse_id, category_id, is_enabled)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
            ');
            $stmt->execute([bin2hex(random_bytes(18)), $nurseId, $catId, $enabled ? 1 : 0]);
        }
        $logger->log($user['user_id'], $user['role'], 'update', 'nurse_category_preference', $nurseId, ['preferences' => count($preferences)]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
