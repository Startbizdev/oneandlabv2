<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/Auth.php';
require_once __DIR__ . '/../../../../lib/Email.php';
require_once __DIR__ . '/../../../../models/User.php';
require_once __DIR__ . '/../../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
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
    $authMiddleware = new AuthMiddleware();
    $authUser = $authMiddleware->handle();

    if ($authUser['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }

    $csrfMiddleware = new CSRFMiddleware();
    $csrfMiddleware->handle();

    $targetId = $_GET['id'] ?? null;
    if (!$targetId) {
        throw new Exception('ID utilisateur requis');
    }

    $userModel = new User();
    $email = $userModel->getDecryptedEmail($targetId);
    if (!$email) {
        throw new Exception('Utilisateur introuvable');
    }

    $auth = new Auth();
    $reset = $auth->createPasswordReset($email, 'admin');

    if ($reset['sent'] && !empty($reset['token']) && !empty($reset['code'])) {
        $emailLib = new Email();
        $emailLib->sendAdminPasswordResetNotice($email);
        $emailLib->sendPasswordReset($email, $reset['token'], $reset['code'], 60);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Email de réinitialisation envoyé.',
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
