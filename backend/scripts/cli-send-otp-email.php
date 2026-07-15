<?php

/**
 * Envoi OTP en sous-processus (détaché de PHP-FPM) pour ne pas bloquer la réponse HTTP.
 *
 * Usage: php cli-send-otp-email.php <path-to-json-envelope>
 * Envelope: {"to":"email@example.com","otp":"123456","user_id":"uuid"}
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit(1);
}

ini_set('default_socket_timeout', (string) ($_ENV['SMTP_TIMEOUT_SECONDS'] ?? 15));

$envelopePath = $argv[1] ?? '';
if ($envelopePath === '' || !is_file($envelopePath)) {
    fwrite(STDERR, "cli-send-otp-email: envelope manquant\n");
    exit(1);
}

$raw = file_get_contents($envelopePath);
@unlink($envelopePath);

$data = json_decode($raw ?: '', true);
if (!is_array($data) || empty($data['to']) || empty($data['otp'])) {
    fwrite(STDERR, "cli-send-otp-email: envelope invalide\n");
    exit(1);
}

$backendDir = dirname(__DIR__);
$envFile = $backendDir . '/../.env';
if (is_file($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

require_once $backendDir . '/lib/Email.php';
require_once $backendDir . '/lib/Logger.php';

$to = (string) $data['to'];
$otp = (string) $data['otp'];
$userId = isset($data['user_id']) ? (string) $data['user_id'] : null;

$t0 = microtime(true);
$email = new Email();
$sent = $email->sendOTP($to, $otp);
$ms = (int) round((microtime(true) - $t0) * 1000);

if (!$sent) {
    $logger = new Logger();
    $logger->log(
        null,
        null,
        'otp_email_failed',
        'auth',
        null,
        [
            'email_hash' => hash('sha256', strtolower($to)),
            'smtp_ms' => $ms,
            'via' => 'cli',
            'user_id_hint' => $userId,
        ]
    );
    fwrite(STDERR, "cli-send-otp-email: échec SMTP ({$ms}ms)\n");
    exit(1);
}

error_log("cli-send-otp-email: OK {$ms}ms to_hash=" . hash('sha256', strtolower($to)));
exit(0);
