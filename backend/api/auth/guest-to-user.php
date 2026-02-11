<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Auth.php';
require_once __DIR__ . '/../../lib/Email.php';
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
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

// Gérer la requête preflight OPTIONS
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
    
    $email = $input['email'];
    $emailHash = hash('sha256', strtolower($email));
    
    $userModel = new User();
    $auth = new Auth();
    $emailLib = new Email();
    
    // Vérifier si l'utilisateur existe
    $existingUser = $userModel->findByEmailHash($emailHash);
    
    if ($existingUser) {
        // Utilisateur existe : envoyer OTP pour connexion
        $result = $auth->requestOTP($email);
        if (isset($result['otp'])) {
            $emailLib->sendOTP($email, $result['otp']);
        }
        
        echo json_encode([
            'success' => true,
            'action' => 'login',
            'user_id' => $existingUser['id'],
            'session_id' => $result['session_id'] ?? null,
        ]);
    } else {
        // Nouvel utilisateur : créer compte avec les données du formulaire (page register patient) puis envoyer OTP
        $userData = [
            'email' => $email,
            'first_name' => $input['first_name'] ?? '',
            'last_name' => $input['last_name'] ?? '',
            'phone' => $input['phone'] ?? null,
            'role' => 'patient',
        ];
        if (!empty($input['birth_date'])) {
            $userData['birth_date'] = $input['birth_date'];
        }
        if (!empty($input['gender'])) {
            $userData['gender'] = $input['gender'];
        }
        if (!empty($input['address']) && is_array($input['address'])) {
            $userData['address'] = $input['address'];
        }
        
        $userId = $userModel->create($userData, 'system', 'system');
        
        // Maintenant que l'utilisateur existe, requestOTP() ne le recréera pas
        $result = $auth->requestOTP($email);
        if (isset($result['otp'])) {
            $emailLib->sendOTP($email, $result['otp']);
        }
        
        echo json_encode([
            'success' => true,
            'action' => 'create',
            'user_id' => $userId,
            'session_id' => $result['session_id'] ?? null,
        ]);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'VALIDATION_ERROR',
    ]);
}

