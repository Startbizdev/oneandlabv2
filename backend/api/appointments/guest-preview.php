<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation des données sans stockage
    if (!isset($input['type']) || !Validation::appointmentType($input['type'])) {
        throw new Exception('Type de rendez-vous invalide');
    }
    
    if (!isset($input['scheduled_at']) || !Validation::datetime($input['scheduled_at'])) {
        throw new Exception('Date et heure invalides');
    }
    
    if (!isset($input['address']['lat'], $input['address']['lng'])) {
        throw new Exception('Adresse invalide');
    }
    
    if (!Validation::latitude($input['address']['lat']) || !Validation::longitude($input['address']['lng'])) {
        throw new Exception('Coordonnées géographiques invalides');
    }
    
    // Validation réussie
    echo json_encode([
        'success' => true,
        'message' => 'Données valides',
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'VALIDATION_ERROR',
    ]);
}




