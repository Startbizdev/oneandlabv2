<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../lib/auth_public_helpers.php';
require_once __DIR__ . '/../../lib/users/AccountDeletionService.php';

authPublicCors('DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée', 'code' => 'METHOD_NOT_ALLOWED']);
    exit;
}

$authUser = (new AuthMiddleware())->handle();
CSRFMiddleware::handle();

try {
    $input = json_decode((string) file_get_contents('php://input'), true);
    $confirmation = is_array($input) ? ($input['confirmation'] ?? null) : null;

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

    $result = $service->deleteOwnPatientAccount($authUser['user_id'], $authUser['role'], $confirmation);

    echo json_encode([
        'success' => true,
        'data' => [
            'deleted' => true,
            'deleted_documents' => $result['deleted_documents'],
            'deleted_reviews' => $result['deleted_reviews'],
        ],
    ]);
} catch (AccountDeletionDenied $e) {
    http_response_code($e->httpStatus);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => $e->errorCode]);
} catch (Throwable $e) {
    error_log('DELETE /api/auth/account user=' . $authUser['user_id'] . ' : ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'La suppression du compte a échoué. Aucune donnée n’a été supprimée. Réessayez ou contactez le support.',
        'code' => 'SERVER_ERROR',
    ]);
}
