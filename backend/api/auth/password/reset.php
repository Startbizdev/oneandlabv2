<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../lib/Auth.php';
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
    if (!RateLimit::allow('auth_password_reset', $ip, 15, 3600)) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => 'Trop de tentatives. Réessayez plus tard.']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $newPassword = (string) ($input['new_password'] ?? '');
    $confirmPassword = (string) ($input['confirm_password'] ?? $newPassword);
    $token = isset($input['token']) ? trim((string) $input['token']) : null;
    $code = isset($input['code']) ? trim((string) $input['code']) : null;
    $email = isset($input['email']) ? trim((string) $input['email']) : null;

    if ($newPassword === '') {
        throw new Exception('Nouveau mot de passe requis');
    }
    if ($newPassword !== $confirmPassword) {
        throw new Exception('Les mots de passe ne correspondent pas');
    }

    $auth = new Auth();
    $auth->resetPasswordWithTokenOrCode($newPassword, $token, $code, $email);

    echo json_encode([
        'success' => true,
        'message' => 'Mot de passe mis à jour. Vous pouvez vous connecter.',
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
