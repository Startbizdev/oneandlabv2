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

    $input = json_decode(file_get_contents('php://input'), true);
    $tempPassword = trim((string) ($input['password'] ?? ''));
    if ($tempPassword === '') {
        $tempPassword = bin2hex(random_bytes(4)) . 'A1!';
    }

    $userModel = new User();
    $email = $userModel->getDecryptedEmail($targetId);
    if (!$email) {
        throw new Exception('Utilisateur introuvable');
    }

    $auth = new Auth();
    $auth->adminSetTemporaryPassword($targetId, $tempPassword);

    $emailLib = new Email();
    $emailLib->sendTemporaryPasswordNotice($email);

    echo json_encode([
        'success' => true,
        'data' => [
            'temporary_password' => $tempPassword,
            'must_change_password' => true,
        ],
        'message' => 'Mot de passe temporaire défini. Communiquez-le une seule fois à l’utilisateur.',
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
