<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/BAN.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin)) {
    // Si pas d'origin (requête directe), autoriser localhost
    $origin = 'http://localhost:3000';
}
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Par défaut, autoriser localhost:3000 pour le développement
    header('Access-Control-Allow-Origin: http://localhost:3000');
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
    $query = $_GET['q'] ?? '';
    $limit = (int) ($_GET['limit'] ?? 10);
    
    if (empty($query)) {
        throw new Exception('Paramètre q (query) requis');
    }
    
    $ban = new BAN();
    $results = $ban->search($query, $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $results,
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'VALIDATION_ERROR',
    ]);
}

