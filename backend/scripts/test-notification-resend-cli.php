<?php
/**
 * Test CLI — envoi email via Brevo (SMTP) + service renvoi admin.
 * Usage (sur serveur) :
 *   cd /var/www/oneandlab/backend
 *   php scripts/test-notification-resend-cli.php --dry-run
 *   php scripts/test-notification-resend-cli.php --appointment-id=<uuid> --type=appointment_created
 *   php scripts/test-notification-resend-cli.php --smtp-only test@example.com
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Email.php';
require_once __DIR__ . '/../lib/EmailQueue.php';
require_once __DIR__ . '/../lib/admin/AppointmentNotificationResendService.php';

$opts = getopt('', ['dry-run', 'appointment-id:', 'type:', 'smtp-only:', 'admin-id:']);

$smtpHost = $_ENV['SMTP_HOST'] ?? '';
$smtpUser = $_ENV['SMTP_USER'] ?? '';
echo "SMTP_HOST={$smtpHost}\n";
echo 'SMTP_USER=' . ($smtpUser !== '' ? substr($smtpUser, 0, 8) . '…' : '(vide)') . "\n";
echo 'Brevo=' . (str_contains(strtolower($smtpHost), 'brevo') ? 'yes' : 'no') . "\n";

if (isset($opts['smtp-only'])) {
    $to = trim((string) $opts['smtp-only']);
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        fwrite(STDERR, "Email invalide pour --smtp-only\n");
        exit(1);
    }
    if (isset($opts['dry-run'])) {
        echo "DRY-RUN: enverrait test SMTP Brevo à {$to}\n";
        exit(0);
    }
    $mail = new Email();
    $ok = $mail->send(
        $to,
        '[Cary test] Brevo SMTP OK',
        '<p>Test SMTP Brevo depuis test-notification-resend-cli.php — ' . date('c') . '</p>',
        true
    );
    echo $ok ? "SMTP OK → {$to}\n" : "SMTP FAIL\n";
    exit($ok ? 0 : 1);
}

$appointmentId = trim((string) ($opts['appointment-id'] ?? ''));
$type = trim((string) ($opts['type'] ?? 'appointment_created'));
$adminId = trim((string) ($opts['admin-id'] ?? ''));

if ($appointmentId === '') {
    echo "Usage: --appointment-id=UUID [--type=appointment_created|new_appointment_pro|…] [--admin-id=UUID]\n";
    echo "       --smtp-only=email@test.com [--dry-run]\n";
    exit(0);
}

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

if ($adminId === '') {
    $stmt = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1");
    $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
    $adminId = $row ? (string) $row['id'] : '';
}
if ($adminId === '') {
    fwrite(STDERR, "Aucun super_admin trouvé — passer --admin-id\n");
    exit(1);
}

if (isset($opts['dry-run'])) {
    echo "DRY-RUN: resendBulk appointment={$appointmentId} type={$type} admin={$adminId}\n";
    exit(0);
}

$service = new AppointmentNotificationResendService($db);
try {
    $result = $service->resendBulk([$appointmentId], $type, $adminId, null);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(($result['sent'] ?? 0) > 0 ? 0 : 2);
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
