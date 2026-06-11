<?php

/**
 * Helpers communs endpoints IAP.
 */
function iapBootstrap(): array
{
    require_once __DIR__ . '/../../config/cors.php';
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
    require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
    require_once __DIR__ . '/../../lib/SubscriptionService.php';
    require_once __DIR__ . '/../../lib/AppleIapVerifier.php';
    require_once __DIR__ . '/../../lib/GoogleIapVerifier.php';

    $corsConfig = require __DIR__ . '/../../config/cors.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (
        in_array($origin, $corsConfig['allowed_origins'], true)
        || strpos($origin, 'http://localhost:') === 0
        || strpos($origin, 'http://127.0.0.1:') === 0
    ) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $config = require __DIR__ . '/../../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    $iapConfig = require __DIR__ . '/../../config/iap.php';

    return [
        'pdo' => $pdo,
        'iapConfig' => $iapConfig,
        'subscriptionService' => new SubscriptionService($pdo),
    ];
}

function iapRequireNurseAuth(): array
{
    try {
        $authMiddleware = new AuthMiddleware();
        $authUser = $authMiddleware->handle();
        $roleMiddleware = new RoleMiddleware();
        $roleMiddleware->handle($authUser, ['nurse']);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }

    return $authUser;
}

function iapReadJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $json = json_decode($raw ?: '', true);

    return is_array($json) ? $json : [];
}
