<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../models/Review.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
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

$revieweeId = $_GET['reviewee_id'] ?? null;

if (!$revieweeId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'reviewee_id requis',
        'code' => 'VALIDATION_ERROR',
    ]);
    exit;
}

try {
    $reviewModel = new Review();
    $stats = $reviewModel->getStats($revieweeId);
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'SERVER_ERROR',
    ]);
}




