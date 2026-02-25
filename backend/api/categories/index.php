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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true'); // Autoriser l'envoi de cookies pour les sessions

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des catégories (public pour patients, authentifié pour admins)
    try {
        $type = $_GET['type'] ?? null;
        $providerId = $_GET['provider_id'] ?? null;
        $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === 'true';

        // Vérifier si l'utilisateur est authentifié (pour voir les catégories inactives)
        $user = null;
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authMiddleware = new AuthMiddleware();
            $user = $authMiddleware->handle();
        }

        // Si provider_id est fourni, retourner uniquement les catégories activées par ce provider
        if ($providerId) {
            // Déterminer le rôle du provider
            $roleStmt = $db->prepare('SELECT role FROM profiles WHERE id = ?');
            $roleStmt->execute([$providerId]);
            $providerRow = $roleStmt->fetch(PDO::FETCH_ASSOC);

            if ($providerRow && $providerRow['role'] === 'nurse') {
                // Infirmier : catégories nursing activées via nurse_category_preferences
                $iconColStmt = $db->query("SHOW COLUMNS FROM care_categories LIKE 'icon'");
                $iconCol = $iconColStmt && $iconColStmt->rowCount() > 0 ? ', cc.icon' : '';
                $sql = "
                    SELECT cc.id, cc.name, cc.description, cc.type{$iconCol}, cc.is_active, cc.created_at
                    FROM care_categories cc
                    LEFT JOIN nurse_category_preferences ncp
                        ON cc.id = ncp.category_id AND ncp.nurse_id = ?
                    WHERE cc.is_active = TRUE
                    AND cc.type = 'nursing'
                    AND (ncp.id IS NULL OR ncp.is_enabled = TRUE)
                    ORDER BY cc.name ASC
                ";
                $stmt = $db->prepare($sql);
                $stmt->execute([$providerId]);
                $categories = $stmt->fetchAll();
            } else {
                // Lab/subaccount : toutes les catégories blood_test actives
                $sql = 'SELECT id, name, description, type, icon, is_active, created_at FROM care_categories WHERE is_active = TRUE AND type = ? ORDER BY name ASC';
                $stmt = $db->prepare($sql);
                $stmt->execute(['blood_test']);
                $categories = $stmt->fetchAll();
            }
        } else {
            $sql = 'SELECT id, name, description, type, icon, is_active, created_at FROM care_categories WHERE 1=1';
            $params = [];

            if (!$includeInactive || !$user) {
                $sql .= ' AND is_active = TRUE';
            }

            if ($type) {
                $sql .= ' AND type = ?';
                $params[] = $type;
            }

            $sql .= ' ORDER BY name ASC';

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $categories = $stmt->fetchAll();
        }

        echo json_encode([
            'success' => true,
            'data' => $categories,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Authentification requise pour créer
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();

    // Vérifier rôle admin
    if ($user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }

    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['name']) || !isset($data['type'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        $id = bin2hex(random_bytes(18));
        $isActive = 1;
        if (array_key_exists('is_active', $data)) {
            $v = $data['is_active'];
            $isActive = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }

        $stmt = $db->prepare('
            INSERT INTO care_categories (id, name, description, type, icon, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ');

        $stmt->execute([
            $id,
            $data['name'],
            $data['description'] ?? '',
            $data['type'],
            $data['icon'] ?? null,
            $isActive
        ]);

        $logger->log($user['user_id'], $user['role'], 'create', 'care_category', $id, $data);

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $id,
                'name' => $data['name'],
                'description' => $data['description'] ?? '',
                'type' => $data['type'],
                'icon' => $data['icon'] ?? null,
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
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

