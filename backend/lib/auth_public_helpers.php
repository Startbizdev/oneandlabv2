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
    // Temporaire : OTP en clair dans la réponse sauf EXPOSE_OTP_IN_API=false explicite.
    // Remettre le garde-fou prod (APP_ENV) quand les tests auth dual seront terminés.
    return filter_var($_ENV['EXPOSE_OTP_IN_API'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
}
