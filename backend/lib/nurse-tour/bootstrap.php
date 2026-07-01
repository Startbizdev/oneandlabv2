<?php

declare(strict_types=1);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';

function nurse_tour_db(): PDO
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

function nurse_tour_apply_cors(array $methods = ['GET', 'POST', 'PATCH', 'OPTIONS']): void
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

function nurse_tour_handle_options(array $methods = ['GET', 'POST', 'PATCH', 'OPTIONS']): void
{
    nurse_tour_apply_cors($methods);
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function nurse_tour_require_nurse(): array
{
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    if (($user['role'] ?? '') !== 'nurse') {
        nurse_tour_json_error('Accès réservé aux infirmiers', 403);
    }

    return $user;
}

function nurse_tour_json_response(array $payload, int $code = 200): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function nurse_tour_json_error(string $message, int $code = 400, ?string $errorCode = null): void
{
    $payload = ['success' => false, 'error' => $message];
    if ($errorCode !== null) {
        $payload['code'] = $errorCode;
    }
    nurse_tour_json_response($payload, $code);
}

function nurse_tour_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function nurse_tour_uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function nurse_tour_parse_date(?string $raw): string
{
    $raw = trim((string) $raw);
    if ($raw === '') {
        return (new DateTimeImmutable('now', new DateTimeZone('Europe/Paris')))->format('Y-m-d');
    }
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $raw, new DateTimeZone('Europe/Paris'));
    if (!$dt) {
        nurse_tour_json_error('Date invalide (YYYY-MM-DD attendu)', 400);
    }

    return $dt->format('Y-m-d');
}
