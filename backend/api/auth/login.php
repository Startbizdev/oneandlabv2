<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../lib/Auth.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../lib/auth_public_helpers.php';

authPublicCors('POST, OPTIONS');

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
    if (!RateLimit::allow('auth_login', $ip, 20, 900)) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => 'Trop de tentatives. Réessayez dans quelques minutes.']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($email === '' || $password === '') {
        throw new Exception('Email et mot de passe requis');
    }

    $auth = new Auth();
    $result = $auth->loginWithPassword($email, $password);

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
