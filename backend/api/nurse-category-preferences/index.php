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
                cc.type,
                cc.icon
            FROM nurse_category_preferences ncp
            JOIN care_categories cc ON ncp.category_id = cc.id
            WHERE ncp.nurse_id = ? AND cc.is_active = TRUE AND cc.type = \'nursing\'
            ORDER BY cc.type, cc.name
        ');
        $stmt->execute([$user['user_id']]);
        $preferences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Récupérer aussi les catégories non préférencées (avec is_enabled = true par défaut) — uniquement type nursing
        $stmt = $db->prepare('
            SELECT
                cc.id as category_id,
                cc.name,
                cc.description,
                cc.type,
                cc.icon,
                TRUE as is_enabled
            FROM care_categories cc
            WHERE cc.is_active = TRUE AND cc.type = \'nursing\'
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

        if (!$data || empty($data['category_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        // is_enabled : accepter bool, int, ou string et forcer 0/1 pour MySQL
        $isEnabled = (int) filter_var($data['is_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Vérifier que la catégorie existe, est active et de type nursing
        $stmt = $db->prepare('SELECT id FROM care_categories WHERE id = ? AND is_active = TRUE AND type = \'nursing\'');
        $stmt->execute([$data['category_id']]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$category) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Catégorie invalide']);
            exit;
        }

        // Limite types de soins selon l'abonnement (discovery = 3, nurse_pro = illimité)
        if ($isEnabled) {
            $stmtSub = $db->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
            $stmtSub->execute([$user['user_id']]);
            $sub = $stmtSub->fetch(PDO::FETCH_ASSOC);
            $planSlug = $sub ? ($sub['plan_slug'] ?? 'discovery') : 'discovery';
            $limits = require __DIR__ . '/../../config/plan-limits.php';
            $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];
            $maxCareTypes = $nurseLimits['max_care_types'] ?? 3;
            if ($maxCareTypes !== null) {
                $stmtCount = $db->prepare('SELECT COUNT(*) FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = 1 AND category_id != ?');
                $stmtCount->execute([$user['user_id'], $data['category_id']]);
                $currentEnabled = (int) $stmtCount->fetchColumn();
                if ($currentEnabled >= $maxCareTypes) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false,
                        'error' => "Votre offre Découverte limite à {$maxCareTypes} types de soins. Passez à l'offre Pro pour en proposer davantage.",
                        'code' => 'PLAN_LIMIT',
                    ]);
                    exit;
                }
            }
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
            $isEnabled
        ]);

        $logger->log($user['user_id'], $user['role'], 'update', 'nurse_category_preference', $id, $data);

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $id,
                'category_id' => $data['category_id'],
                'is_enabled' => (bool) $isEnabled
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

