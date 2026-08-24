<?php
/**
 * Smoke test prod — Brevo + renvoi admin (sans HTTP).
 * php scripts/prod-smoke-test.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/admin/AppointmentNotificationResendService.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$checks = [];

$host = $_ENV['SMTP_HOST'] ?? '';
$checks['brevo_smtp'] = str_contains(strtolower($host), 'brevo') ? 'OK' : "FAIL ($host)";

$col = $db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_generation_enabled'")->fetch(PDO::FETCH_ASSOC);
$checks['prescription_column'] = $col ? 'OK' : 'FAIL';

$admin = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$apt = $db->query("SELECT id FROM appointments ORDER BY created_at DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$checks['super_admin'] = $admin ? 'OK' : 'FAIL';
$checks['sample_appointment'] = $apt ? (string) $apt['id'] : 'FAIL';

if ($admin && $apt) {
    $service = new AppointmentNotificationResendService($db);
    try {
        $result = $service->resendBulk([(string) $apt['id']], 'appointment_created', (string) $admin['id'], null);
        $checks['resend_service'] = 'sent=' . ($result['sent'] ?? 0) . ' skipped=' . count($result['skipped'] ?? []);
    } catch (Throwable $e) {
        $checks['resend_service'] = 'FAIL: ' . $e->getMessage();
    }
}

echo json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
