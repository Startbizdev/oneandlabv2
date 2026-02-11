<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
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

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

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
    
    if (!isset($input['response'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Réponse requise']);
        exit;
    }
    
    // Vérifier que l'utilisateur est le professionnel noté
    $stmt = $db->prepare('SELECT reviewee_id FROM reviews WHERE id = ?');
    $stmt->execute([$id]);
    $review = $stmt->fetch();
    
    if (!$review) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Avis introuvable',
            'code' => 'NOT_FOUND',
        ]);
        exit;
    }
    
    if ($review['reviewee_id'] !== $user['user_id']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Vous n\'êtes pas autorisé à répondre à cet avis',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }
    
    // Mettre à jour la réponse
    $stmt = $db->prepare('
        UPDATE reviews 
        SET response = ?, response_at = NOW()
        WHERE id = ?
    ');
    
    $stmt->execute([$input['response'], $id]);
    
    echo json_encode(['success' => true]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

