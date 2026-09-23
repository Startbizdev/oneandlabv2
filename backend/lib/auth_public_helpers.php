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
    $remoteAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $trustedProxies = array_values(array_filter(array_map(
        'trim',
        explode(',', (string) ($_ENV['TRUSTED_PROXY_IPS'] ?? getenv('TRUSTED_PROXY_IPS') ?: ''))
    )));

    // X-Forwarded-For est contrôlé par le client sauf si la connexion provient
    // d'un reverse proxy explicitement approuvé.
    if ($remoteAddress !== '' && in_array($remoteAddress, $trustedProxies, true)) {
        $forwarded = explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
        $candidate = trim((string) ($forwarded[0] ?? ''));
        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            return $candidate;
        }
    }

    return filter_var($remoteAddress, FILTER_VALIDATE_IP) ? $remoteAddress : 'unknown';
}

function authExposeOtpInResponse(): bool
{
    if (array_key_exists('EXPOSE_OTP_IN_API', $_ENV)) {
        return filter_var($_ENV['EXPOSE_OTP_IN_API'], FILTER_VALIDATE_BOOLEAN);
    }

    $env = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production')));
    return in_array($env, ['development', 'dev', 'local'], true);
}

/**
 * Lance l'envoi OTP dans un sous-processus PHP détaché (ne bloque pas PHP-FPM).
 * Retourne false si le spawn échoue (l'appelant peut retomber sur un envoi synchrone).
 */
function authSpawnOtpEmailSend(string $to, string $otp, ?string $userId = null): bool
{
    $script = __DIR__ . '/../scripts/cli-send-otp-email.php';
    if (!is_file($script)) {
        return false;
    }

    $tmpPath = tempnam(sys_get_temp_dir(), 'one-otp-');
    if ($tmpPath === false) {
        return false;
    }

    $envelope = json_encode([
        'to' => $to,
        'otp' => $otp,
        'user_id' => $userId,
    ], JSON_UNESCAPED_UNICODE);

    if ($envelope === false || @file_put_contents($tmpPath, $envelope) === false) {
        @unlink($tmpPath);
        return false;
    }

    $phpBin = defined('PHP_BINARY') && PHP_BINARY !== '' && @is_executable(PHP_BINARY) ? PHP_BINARY : 'php';
    $cmdLine = implode(' ', [
        escapeshellarg($phpBin),
        escapeshellarg($script),
        escapeshellarg($tmpPath),
    ]);

    try {
        if (PHP_OS_FAMILY === 'Windows') {
            pclose(popen('start /B "" ' . $cmdLine . ' 1>NUL 2>NUL', 'r'));
        } else {
            exec($cmdLine . ' > /dev/null 2>&1 &');
        }
        return true;
    } catch (Throwable $e) {
        @unlink($tmpPath);
        error_log('authSpawnOtpEmailSend failed: ' . $e->getMessage());
        return false;
    }
}
