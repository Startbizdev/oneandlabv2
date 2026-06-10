<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../lib/Auth.php';
require_once __DIR__ . '/../../../lib/Email.php';
require_once __DIR__ . '/../../../lib/RateLimit.php';
require_once __DIR__ . '/../../../lib/auth_public_helpers.php';

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
    if (!RateLimit::allow('auth_password_forgot', $ip, 10, 3600)) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => 'Trop de demandes. Réessayez plus tard.']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim((string) ($input['email'] ?? ''));

    if ($email === '') {
        throw new Exception('Email requis');
    }

    $auth = new Auth();
    $reset = $auth->createPasswordReset($email, 'self');

    if ($reset['sent'] && !empty($reset['token']) && !empty($reset['code'])) {
        $emailLib = new Email();
        $emailLib->sendPasswordReset($email, $reset['token'], $reset['code'], 60);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Si un compte existe avec cet email, vous recevrez les instructions de réinitialisation.',
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
