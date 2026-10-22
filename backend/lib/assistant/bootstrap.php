<?php

declare(strict_types=1);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../ApiServerError.php';
require_once __DIR__ . '/AssistantError.php';

/** Rôles disposant de l'assistant ; labo, sous-compte et admin n'en ont pas. */
const ASSISTANT_ROLES = ['patient', 'nurse', 'pro', 'preleveur'];
const ASSISTANT_STAFF_ROLES = ['nurse', 'pro', 'preleveur'];

function assistant_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $config = require __DIR__ . '/../../config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

    return $pdo;
}

function assistant_env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? getenv($key);

    return ($v === false || $v === null || $v === '') ? $default : (string) $v;
}

function assistant_handle_options(array $methods): void
{
    $corsConfig = require __DIR__ . '/../../config/cors.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $corsConfig['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', $methods, true)) {
        assistant_json_error('Méthode non autorisée', 405, 'METHOD_NOT_ALLOWED');
    }
}

/** @param list<string> $roles */
function assistant_require_user(array $roles = ASSISTANT_ROLES): array
{
    $user = (new AuthMiddleware())->handle();
    if (!in_array((string) ($user['role'] ?? ''), $roles, true)) {
        assistant_json_error('L\'assistant n\'est pas disponible pour votre profil.', 403, 'ASSISTANT_ROLE_NOT_SUPPORTED');
    }

    return $user;
}

function assistant_json_response(array $payload, int $code = 200): never
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function assistant_json_error(string $message, int $code, string $errorCode, ?int $retryAfter = null): never
{
    $payload = ['success' => false, 'error' => $message, 'code' => $errorCode];
    if ($retryAfter !== null) {
        $payload['retry_after'] = $retryAfter;
        if (!headers_sent()) {
            header('Retry-After: ' . $retryAfter);
        }
    }
    assistant_json_response($payload, $code);
}

/** @return array{status: int, code: string, message: string, retry_after: ?int} */
function assistant_describe_error(Throwable $e, string $context): array
{
    if ($e instanceof AssistantError) {
        if ($e->httpStatus >= 500) {
            ApiServerError::log($context, $e);
        }

        return ['status' => $e->httpStatus, 'code' => $e->errorCode, 'message' => $e->getMessage(), 'retry_after' => $e->retryAfter];
    }
    if ($e instanceof HttpStatusException) {
        return ['status' => $e->httpStatus, 'code' => $e->errorCode, 'message' => $e->getMessage(), 'retry_after' => null];
    }
    if ($e instanceof InvalidArgumentException) {
        return ['status' => 400, 'code' => 'VALIDATION_ERROR', 'message' => $e->getMessage(), 'retry_after' => null];
    }
    ApiServerError::log($context, $e);

    return ['status' => 500, 'code' => 'ASSISTANT_UNAVAILABLE', 'message' => AssistantError::UNAVAILABLE_MESSAGE, 'retry_after' => null];
}

function assistant_respond_error(Throwable $e, string $context): never
{
    $error = assistant_describe_error($e, $context);
    assistant_json_error($error['message'], $error['status'], $error['code'], $error['retry_after']);
}

function assistant_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = is_string($raw) && trim($raw) !== '' ? json_decode($raw, true) : [];

    return is_array($decoded) ? $decoded : [];
}
