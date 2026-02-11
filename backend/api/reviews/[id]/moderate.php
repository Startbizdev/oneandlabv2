<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../models/Review.php';
require_once __DIR__ . '/../../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification + Vérification rôle admin
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

$reviewModel = new Review();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['action'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action requise (hide/show)']);
        exit;
    }
    
    $action = $input['action']; // 'hide' ou 'show'
    $moderationNote = $input['moderation_note'] ?? null;
    
    if (!in_array($action, ['hide', 'show'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action invalide']);
        exit;
    }
    
    try {
        $isVisible = $action === 'show';
        
        $reviewModel->moderate(
            $id,
            $isVisible,
            $user['user_id'],
            $moderationNote
        );
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'VALIDATION_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

