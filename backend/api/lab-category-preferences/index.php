<?php

/**
 * GET/PUT des préférences de soins (catégories blood_test) du laboratoire ou sous-compte connecté.
 * GET /lab-category-preferences
 * PUT /lab-category-preferences body: { category_id, is_enabled } ou { preferences: [{ category_id, is_enabled }] }
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
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

$role = $user['role'] ?? '';
if (!in_array($role, ['lab', 'subaccount'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$labId = $user['user_id'];

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$logger = new Logger();

$stmt = $db->query("SHOW TABLES LIKE 'lab_category_preferences'");
if ($stmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Table lab_category_preferences non disponible']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $db->prepare('
            SELECT lcp.id, lcp.category_id, lcp.is_enabled, cc.name, cc.description, cc.type, cc.icon
            FROM lab_category_preferences lcp
            JOIN care_categories cc ON lcp.category_id = cc.id
            WHERE lcp.lab_id = ? AND cc.is_active = TRUE AND cc.type = \'blood_test\'
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$labId]);
        $preferences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare('
            SELECT cc.id as category_id, cc.name, cc.description, cc.type, cc.icon, TRUE as is_enabled
            FROM care_categories cc
            WHERE cc.is_active = TRUE AND cc.type = \'blood_test\'
            AND cc.id NOT IN (SELECT category_id FROM lab_category_preferences WHERE lab_id = ?)
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$labId]);
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

    $preferences = isset($input['preferences']) && is_array($input['preferences'])
        ? $input['preferences']
        : (isset($input['category_id']) ? [['category_id' => $input['category_id'], 'is_enabled' => $input['is_enabled'] ?? true]] : []);

    if (empty($preferences)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Données invalides']);
        exit;
    }

    try {
        foreach ($preferences as $pref) {
            $catId = $pref['category_id'] ?? null;
            $enabled = (bool) ($pref['is_enabled'] ?? true);
            if (!$catId) continue;
            $stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ? AND is_active = TRUE AND type = \'blood_test\'');
            $stmt->execute([$catId]);
            if (!$stmt->fetch()) continue;
            $stmt = $db->prepare('
                INSERT INTO lab_category_preferences (id, lab_id, category_id, is_enabled)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
            ');
            $stmt->execute([bin2hex(random_bytes(18)), $labId, $catId, $enabled ? 1 : 0]);
        }
        $logger->log($user['user_id'], $user['role'], 'update', 'lab_category_preference', $labId, ['preferences' => count($preferences)]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
