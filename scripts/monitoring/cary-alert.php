<?php

declare(strict_types=1);

/**
 * Envoie une alerte de supervision par e-mail (Brevo, configuration du .env).
 * Usage : php cary-alert.php "Sujet" "Ligne 1" ["Ligne 2" ...]
 * Destinataire : MONITOR_ALERT_EMAIL, sinon ADMIN_NOTIFY_EMAIL, sinon contact@cary.bio.
 */

$appBase = getenv('APP_BASE') ?: '/var/www/oneandlab';
require $appBase . '/backend/config/database.php';
require_once $appBase . '/backend/lib/Email.php';

$subject = $argv[1] ?? 'Alerte supervision';
$lines = array_slice($argv, 2);
$to = trim((string) ($_ENV['MONITOR_ALERT_EMAIL'] ?? $_ENV['ADMIN_NOTIFY_EMAIL'] ?? '')) ?: 'contact@cary.bio';
$recipients = array_filter(array_map('trim', explode(',', $to)));

$email = new Email();
$inner = '';
foreach ($lines as $line) {
    $inner .= '<p style="margin:0 0 8px 0;">' . htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . '</p>';
}
$ok = true;
foreach ($recipients as $recipient) {
    $ok = $email->sendStaffAlert($recipient, '[Cary Supervision] ' . $subject, $subject, $inner) && $ok;
}
exit($ok ? 0 : 1);
