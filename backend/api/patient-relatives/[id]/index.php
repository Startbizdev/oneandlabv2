<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../models/PatientRelative.php';
require_once __DIR__ . '/../../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

// Seuls les patients peuvent gérer leurs proches
if ($user['role'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

// Extraire l'ID depuis l'URL
$urlParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$id = end($urlParts);

if (!$id || $id === 'index.php') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du proche requis']);
    exit;
}

$relativeModel = new PatientRelative();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'un proche
    try {
        $relative = $relativeModel->getById($id, $user['user_id']);

        if (!$relative) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Proche introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        // Logger la consultation de données sensibles (HDS)
        require_once __DIR__ . '/../../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'patient_relative',
            $id,
            [
                'relationship_type' => $relative['relationship_type'],
                'has_sensitive_data' => !empty($relative['email']) || !empty($relative['phone'])
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $relative,
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
    // Mettre à jour un proche
    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            exit;
        }

        // Validation du type de relation si fourni
        if (isset($data['relationship_type'])) {
            $allowedRelationships = ['child', 'parent', 'spouse', 'sibling', 'grandparent', 'grandchild', 'other'];
            if (!in_array($data['relationship_type'], $allowedRelationships)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Type de relation invalide']);
                exit;
            }
        }

        $success = $relativeModel->update($id, $data, $user['user_id']);

        if (!$success) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Proche introuvable ou accès refusé',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        // Récupérer le proche mis à jour
        $relative = $relativeModel->getById($id, $user['user_id']);

        echo json_encode([
            'success' => true,
            'data' => $relative
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
    // Supprimer un proche
    CSRFMiddleware::handle();

    try {
        $success = $relativeModel->delete($id, $user['user_id']);

        if (!$success) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Proche introuvable ou accès refusé',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Proche supprimé avec succès'
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
