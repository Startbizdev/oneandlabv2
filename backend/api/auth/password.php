<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../lib/Auth.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/auth_public_helpers.php';

authPublicCors('PUT, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    $authMiddleware = new AuthMiddleware();
    $authUser = $authMiddleware->handle();

    $csrfMiddleware = new CSRFMiddleware();
    $csrfMiddleware->handle();

    $input = json_decode(file_get_contents('php://input'), true);
    $newPassword = (string) ($input['new_password'] ?? '');
    $confirmPassword = (string) ($input['confirm_password'] ?? $newPassword);
    $currentPassword = isset($input['current_password']) ? (string) $input['current_password'] : null;

    if ($newPassword === '') {
        throw new Exception('Nouveau mot de passe requis');
    }
    if ($newPassword !== $confirmPassword) {
        throw new Exception('Les mots de passe ne correspondent pas');
    }

    $userModel = new User();
    $email = $userModel->getDecryptedEmail($authUser['user_id']);

    $auth = new Auth();
    $result = $auth->updatePassword(
        $authUser['user_id'],
        $currentPassword,
        $newPassword,
        $email
    );

    echo json_encode([
        'success' => true,
        'data' => $result,
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
