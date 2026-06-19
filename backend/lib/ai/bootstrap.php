<?php

declare(strict_types=1);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';

function ai_db(): PDO
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

function ai_apply_cors(array $methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']): void
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

function ai_handle_options(array $methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']): void
{
    ai_apply_cors($methods);
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function ai_require_user(?array $allowedRoles = null): array
{
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    if ($allowedRoles !== null) {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, $allowedRoles, true)) {
            ai_json_error('Accès refusé', 403);
        }
    }

    return $user;
}

function ai_json_response(array $payload, int $code = 200): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function ai_json_error(string $message, int $code = 400, ?string $errorCode = null): void
{
    $payload = ['success' => false, 'error' => $message];
    if ($errorCode !== null) {
        $payload['code'] = $errorCode;
    }
    ai_json_response($payload, $code);
}

function ai_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function ai_env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? getenv($key);
    if ($v === false || $v === null || $v === '') {
        return $default;
    }

    return (string) $v;
}
