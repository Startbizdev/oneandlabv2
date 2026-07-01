<?php

declare(strict_types=1);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';

function health_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
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

    return $pdo;
}

function health_apply_cors(array $methods = ['GET', 'POST', 'DELETE', 'OPTIONS']): void
{
    $corsConfig = require __DIR__ . '/../../config/cors.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $corsConfig['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
}

function health_handle_options(array $methods = ['GET', 'POST', 'DELETE', 'OPTIONS']): void
{
    health_apply_cors($methods);
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function health_require_patient(): array
{
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    if (($user['role'] ?? '') !== 'patient') {
        health_json_error('Accès réservé aux patients', 403);
    }

    return $user;
}

function health_json_response(array $payload, int $code = 200): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function health_json_error(string $message, int $code = 400, ?string $errorCode = null): void
{
    $payload = ['success' => false, 'error' => $message];
    if ($errorCode !== null) {
        $payload['code'] = $errorCode;
    }
    health_json_response($payload, $code);
}

function health_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function health_record_require_user(array $roles): array
{
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    if (!in_array($user['role'] ?? '', $roles, true)) {
        health_json_error('Accès refusé', 403);
    }

    return $user;
}

function health_uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
