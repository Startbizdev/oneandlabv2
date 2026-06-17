<?php

/**
 * CORS + OPTIONS pour endpoints auth publics.
 */
function authPublicCors(string $methods = 'POST, OPTIONS'): void
{
    $corsConfig = require __DIR__ . '/../config/cors.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';

    if ($origin && in_array($origin, $corsConfig['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } elseif (!$origin) {
        header('Access-Control-Allow-Origin: http://localhost:3000');
    }

    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
}

function authClientIp(): string
{
    return (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function authExposeOtpInResponse(): bool
{
    if (array_key_exists('EXPOSE_OTP_IN_API', $_ENV)) {
        return filter_var($_ENV['EXPOSE_OTP_IN_API'], FILTER_VALIDATE_BOOLEAN);
    }

    $env = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production')));
    return in_array($env, ['development', 'dev', 'local'], true);
}
