<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true'); // Autoriser l'envoi de cookies

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Générer ou récupérer le token CSRF
    $token = CSRFMiddleware::getToken();
    
    // Si pas de token, en générer un nouveau
    if (!$token) {
        $token = CSRFMiddleware::generateToken();
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'csrf_token' => $token,
        ],
    ]);
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Méthode non autorisée',
    'code' => 'METHOD_NOT_ALLOWED',
]);

