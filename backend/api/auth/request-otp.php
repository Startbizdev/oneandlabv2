<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Auth.php';
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';

// IMPORTANT: Les headers CORS doivent être envoyés dans TOUTES les réponses (OPTIONS ET POST)
// Si l'origine est dans la liste autorisée, l'autoriser
if ($origin && in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif ($origin) {
    // Origine non autorisée - rejet silencieux pour la sécurité
} else {
    // Si aucune origine, autoriser localhost:3000 par défaut pour le développement
    header('Access-Control-Allow-Origin: http://localhost:3000');
}

// Ces headers doivent être dans TOUTES les réponses
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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
    
    if (!isset($input['email'])) {
        throw new Exception('Email requis');
    }
    
    $auth = new Auth();
    $emailLib = new Email();
    
    $result = $auth->requestOTP($input['email']);

    // Logger la demande OTP réussie (HDS)
    require_once __DIR__ . '/../../lib/Logger.php';
    $logger = new Logger();
    $logger->log(
        $result['user_id'] ?? null,
        isset($result['user_id']) ? 'patient' : null, // On suppose patient par défaut
        'otp_requested',
        'auth',
        null,
        [
            'method' => 'email',
            'email_hash' => hash('sha256', strtolower($input['email'])),
            'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );

    // Envoyer l'email OTP
    $emailLib->sendOTP($input['email'], $result['otp']);

    // Retirer le code OTP de la réponse (sécurité)
    unset($result['otp']);

    echo json_encode([
        'success' => true,
        'session_id' => $result['session_id'] ?? null,
        'user_id' => $result['user_id'] ?? null,
    ]);
} catch (Exception $e) {
    // Logger l'échec de demande OTP (HDS)
    require_once __DIR__ . '/../../lib/Logger.php';
    $logger = new Logger();
    $logger->log(
        null,
        null,
        'otp_request_failed',
        'auth',
        null,
        [
            'reason' => $e->getMessage(),
            'email_hash' => isset($input['email']) ? hash('sha256', strtolower($input['email'])) : null,
            'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'VALIDATION_ERROR',
    ]);
}

