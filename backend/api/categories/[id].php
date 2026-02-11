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
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification requise
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if ($user['role'] !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
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
$logger = new Logger();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'une catégorie
    try {
        $stmt = $db->prepare('SELECT * FROM care_categories WHERE id = ?');
        $stmt->execute([$id]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$category) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Catégorie introuvable']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => $category,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Modifier une catégorie
    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        // Vérifier que la catégorie existe
        $stmt = $db->prepare('SELECT * FROM care_categories WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Catégorie introuvable']);
            exit;
        }

        $isActive = (int) $existing['is_active'];
        if (array_key_exists('is_active', $data)) {
            $v = $data['is_active'];
            $isActive = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }

        $stmt = $db->prepare('
            UPDATE care_categories
            SET name = ?, description = ?, type = ?, icon = ?, is_active = ?
            WHERE id = ?
        ');

        $stmt->execute([
            $data['name'] ?? $existing['name'],
            $data['description'] ?? $existing['description'],
            $data['type'] ?? $existing['type'],
            array_key_exists('icon', $data) ? $data['icon'] : $existing['icon'],
            $isActive,
            $id
        ]);

        $logger->log($user['user_id'], $user['role'], 'update', 'care_category', $id, $data);

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $id,
                'name' => $data['name'] ?? $existing['name'],
                'description' => $data['description'] ?? $existing['description'],
                'type' => $data['type'] ?? $existing['type'],
                'icon' => array_key_exists('icon', $data) ? $data['icon'] : $existing['icon'],
                'is_active' => (bool) $isActive
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
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Supprimer une catégorie
    CSRFMiddleware::handle();

    try {
        // Vérifier que la catégorie existe
        $stmt = $db->prepare('SELECT * FROM care_categories WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Catégorie introuvable']);
            exit;
        }

        $stmt = $db->prepare('DELETE FROM care_categories WHERE id = ?');
        $stmt->execute([$id]);

        $logger->log($user['user_id'], $user['role'], 'delete', 'care_category', $id);

        echo json_encode([
            'success' => true
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




