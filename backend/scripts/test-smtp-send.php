<?php
/**
 * Test SMTP (IONOS / Cary) — envoi d'un email simple.
 * Usage (depuis backend/) : php scripts/test-smtp-send.php [destinataire]
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
$envFile = $root . '/.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
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

require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once __DIR__ . '/../lib/Email.php';

$to = $argv[1] ?? 'joopixstudio@gmail.com';
$email = new Email();
$subject = 'Test SMTP Cary — ' . gmdate('Y-m-d H:i:s') . ' UTC';
$body = '<p>Email de test depuis Cary (IONOS / contact@cary.bio).</p><p>Si vous recevez ce message, la configuration SMTP est OK.</p>';
$ok = $email->send($to, $subject, $body, true);

if ($ok) {
    echo "OK — email envoyé à {$to}\n";
    exit(0);
}

echo "ÉCHEC — envoi à {$to} (vérifiez SMTP_* dans .env et les logs PHP)\n";
exit(1);
