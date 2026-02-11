<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS - Fonction pour obtenir et valider l'origine
function getValidatedOrigin($corsConfig) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Si pas d'origine dans les headers, essayer de l'extraire du referer
    if (empty($origin) && !empty($_SERVER['HTTP_REFERER'])) {
        $referer = $_SERVER['HTTP_REFERER'];
        $parsedUrl = parse_url($referer);
        if ($parsedUrl) {
            $scheme = $parsedUrl['scheme'] ?? 'http';
            $host = $parsedUrl['host'] ?? '';
            $port = $parsedUrl['port'] ?? null;
            $origin = $scheme . '://' . $host;
            if ($port !== null) {
                $origin .= ':' . $port;
            }
        }
    }
    
    // Fallback pour développement local si toujours vide
    if (empty($origin)) {
        $origin = 'http://localhost:3000';
    }
    
    return $origin;
}

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = getValidatedOrigin($corsConfig);

// Vérifier si l'origine est autorisée et définir les headers CORS
if (in_array($origin, $corsConfig['allowed_origins'], true) || 
    strpos($origin, 'http://localhost:') === 0 || 
    strpos($origin, 'http://127.0.0.1:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    // Authentification requise
    $authMiddleware = new AuthMiddleware();
    $authUser = $authMiddleware->handle();
    
    // Récupérer les informations complètes de l'utilisateur
    $userModel = new User();
    $user = $userModel->getById($authUser['user_id'], $authUser['user_id'], $authUser['role']);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Utilisateur introuvable',
        ]);
        exit;
    }
    
    // Retourner les informations utilisateur
    echo json_encode([
        'success' => true,
        'data' => $user,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    error_log('Error in /api/auth/me: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
}



