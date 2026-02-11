<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification requise
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$logger = new Logger();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des préférences de l'infirmier
    try {
        if ($user['role'] !== 'nurse') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }

        $stmt = $db->prepare('
            SELECT
                ncp.id,
                ncp.category_id,
                ncp.is_enabled,
                cc.name,
                cc.description,
                cc.type
            FROM nurse_category_preferences ncp
            JOIN care_categories cc ON ncp.category_id = cc.id
            WHERE ncp.nurse_id = ? AND cc.is_active = TRUE
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$user['user_id']]);
        $preferences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Récupérer aussi les catégories non préférencées (avec is_enabled = true par défaut)
        $stmt = $db->prepare('
            SELECT
                cc.id as category_id,
                cc.name,
                cc.description,
                cc.type,
                TRUE as is_enabled
            FROM care_categories cc
            WHERE cc.is_active = TRUE
            AND cc.id NOT IN (
                SELECT category_id FROM nurse_category_preferences WHERE nurse_id = ?
            )
        ');
        $stmt->execute([$user['user_id']]);
        $defaultPreferences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => array_merge($preferences, $defaultPreferences),
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Créer/mettre à jour une préférence
    if ($user['role'] !== 'nurse') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }

    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['category_id']) || !isset($data['is_enabled'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        // Vérifier que la catégorie existe et est active
        $stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ? AND is_active = TRUE');
        $stmt->execute([$data['category_id']]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$category) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Catégorie invalide']);
            exit;
        }

        // Insérer ou mettre à jour la préférence
        $stmt = $db->prepare('
            INSERT INTO nurse_category_preferences (id, nurse_id, category_id, is_enabled)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
        ');

        $id = bin2hex(random_bytes(18));
        $stmt->execute([
            $id,
            $user['user_id'],
            $data['category_id'],
            $data['is_enabled']
        ]);

        $logger->log($user['user_id'], $user['role'], 'update', 'nurse_category_preference', $id, $data);

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $id,
                'category_id' => $data['category_id'],
                'is_enabled' => $data['is_enabled']
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

