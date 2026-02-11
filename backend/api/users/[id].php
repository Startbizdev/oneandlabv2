<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../config/cors.php';

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

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$userModel = new User();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'un utilisateur
    try {
        // Vérifier les permissions : on ne peut voir que son propre profil ou être admin
        if ($id !== $user['user_id'] && $user['role'] !== 'super_admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Vous ne pouvez consulter que votre propre profil',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        
        $userData = $userModel->getById($id, $user['user_id'], $user['role']);

        if (!$userData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Utilisateur introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        // Logger la consultation de données sensibles (HDS)
        require_once __DIR__ . '/../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'profile',
            $id,
            [
                'viewed_role' => $userData['role'] ?? null,
                'has_sensitive_data' => !empty($userData['email']) || !empty($userData['phone']) || !empty($userData['address'])
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $userData,
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
    CSRFMiddleware::handle();
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Vérifier les permissions: propre profil, super_admin, ou lab modifiant son subaccount/preleveur
    $canEdit = ($id === $user['user_id']) || $user['role'] === 'super_admin';
    if (!$canEdit && $user['role'] === 'lab') {
        $targetLabId = $userModel->getLabId($id);
        $canEdit = ($targetLabId === $user['user_id']);
    }
    if (!$canEdit) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Vous ne pouvez modifier que votre propre profil ou les membres de votre laboratoire',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }
    
    try {
        $success = $userModel->update($id, $input, $user['user_id'], $user['role']);
        
        if ($success) {
            echo json_encode([
                'success' => true,
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Aucune donnée à mettre à jour',
                'code' => 'NO_UPDATE',
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Supprimer: super_admin ou lab (ses subaccounts/preleveurs uniquement)
    
    // CSRF check
    $csrfMiddleware = new CSRFMiddleware();
    $csrfMiddleware->handle();
    
    if ($id === $user['user_id']) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vous ne pouvez pas supprimer votre propre compte',
        ]);
        exit;
    }
    
    try {
        $success = $userModel->delete($id, $user['user_id'], $user['role']);
        
        if ($success) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Utilisateur non trouvé',
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

