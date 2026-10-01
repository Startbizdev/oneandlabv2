<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../lib/auth_public_helpers.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../lib/users/AccountDeletionService.php';

authPublicCors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée', 'code' => 'METHOD_NOT_ALLOWED']);
    exit;
}

$authUser = (new AuthMiddleware())->handle();
CSRFMiddleware::handle();

if (!RateLimit::allow('account_deletion_request', $authUser['user_id'], 3, 3600)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Demande déjà envoyée. Réessayez dans une heure si besoin.',
        'code' => 'RATE_LIMITED',
    ]);
    exit;
}

try {
    $input = json_decode((string) file_get_contents('php://input'), true);
    $reason = is_array($input) ? ($input['reason'] ?? null) : null;

    $config = require __DIR__ . '/../../config/database.php';
    $db = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
        $config['username'],
        $config['password'],
        $config['options']
    );
    $service = new AccountDeletionService(
        $db,
        new User($db),
        new Logger($db),
        new Email(),
        (require __DIR__ . '/../../config/app.php')['contact_email']
    );

    $service->requestProfessionalDeletion($authUser['user_id'], $authUser['role'], $reason);

    echo json_encode(['success' => true, 'data' => ['requested' => true]]);
} catch (AccountDeletionDenied $e) {
    http_response_code($e->httpStatus);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => $e->errorCode]);
} catch (Throwable $e) {
    error_log('POST /api/auth/account-deletion-request user=' . $authUser['user_id'] . ' : ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'La demande n’a pas pu être envoyée. Réessayez ou contactez le support.',
        'code' => 'SERVER_ERROR',
    ]);
}
