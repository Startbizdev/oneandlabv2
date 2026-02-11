<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Review.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$reviewModel = new Review();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des avis avec filtres
    $revieweeId = $_GET['reviewee_id'] ?? null;
    $appointmentId = $_GET['appointment_id'] ?? null;
    $revieweeType = $_GET['reviewee_type'] ?? null;
    $isVisible = isset($_GET['is_visible']) ? filter_var($_GET['is_visible'], FILTER_VALIDATE_BOOLEAN) : null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    
    // Valider les paramètres
    if ($page < 1) {
        $page = 1;
    }
    if ($limit < 1 || $limit > 100) {
        $limit = 20;
    }
    
    // Construire les filtres
    $filters = [];
    if ($revieweeId) {
        $filters['reviewee_id'] = $revieweeId;
    }
    if ($appointmentId) {
        $filters['appointment_id'] = $appointmentId;
    }
    if ($revieweeType) {
        $filters['reviewee_type'] = $revieweeType;
    }
    if ($isVisible !== null) {
        $filters['is_visible'] = $isVisible;
    }
    
    // Récupérer les avis avec pagination
    $result = $reviewModel->getAll($filters, $page, $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'pagination' => [
            'page' => $result['page'],
            'limit' => $result['limit'],
            'total' => $result['total'],
            'pages' => $result['pages'],
        ],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Création d'un avis
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        if (!isset($input['appointment_id'], $input['reviewee_id'], $input['rating'])) {
            throw new Exception('appointment_id, reviewee_id et rating requis');
        }
        
        if ($input['rating'] < 1 || $input['rating'] > 5) {
            throw new Exception('La note doit être entre 1 et 5');
        }
        
        $id = $reviewModel->create($input, $user['user_id']);
        
        echo json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
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

