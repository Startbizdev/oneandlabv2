<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Auth.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../lib/auth_public_helpers.php';
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
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
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
    $ip = authClientIp();
    if (!RateLimit::allow('auth_verify_otp', $ip, 20, 900)) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Trop de tentatives. Demandez un nouveau code.',
            'code' => 'RATE_LIMITED',
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['user_id'], $input['otp'], $input['session_id'])) {
        throw new Exception('user_id, session_id et otp requis');
    }
    
    // Convertir l'OTP en string et nettoyer
    $otp = is_string($input['otp']) ? $input['otp'] : (string)$input['otp'];
    $otp = trim($otp);
    $otp = preg_replace('/[^0-9]/', '', $otp); // Ne garder que les chiffres
    
    // Vérifier le format du code OTP avant de continuer
    if (strlen($otp) !== 6 || !preg_match('/^\d{6}$/', $otp)) {
        throw new Exception('Code OTP invalide (doit être exactement 6 chiffres)');
    }
    
    // Convertir user_id en string
    $userId = is_string($input['user_id']) ? $input['user_id'] : (string)$input['user_id'];
    $sessionId = is_string($input['session_id'])
        ? trim($input['session_id'])
        : trim((string) $input['session_id']);

    if (!RateLimit::allow('auth_verify_otp_user', $userId, 10, 900)) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Trop de tentatives. Demandez un nouveau code.',
            'code' => 'RATE_LIMITED',
        ]);
        exit;
    }
    
    $auth = new Auth();
    
    try {
        $result = $auth->verifyOTP($sessionId, $otp, $userId);
        echo json_encode($result);
    } catch (Exception $e) {
        throw $e;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'VALIDATION_ERROR',
    ]);
}

