<?php

declare(strict_types=1);

/**
 * Smoke backend prod (SSH, lecture seule) — sans login OTP.
 * Usage: php backend/scripts/audit360-prod-backend-smoke.php [/var/www/oneandlab]
 */

$base = rtrim($argv[1] ?? '/var/www/oneandlab', '/');
$backend = $base . '/backend';

require_once $backend . '/lib/pharmacy/bootstrap.php';

$config = require $backend . '/config/database.php';
$pdo = new PDO(
    sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    ),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

$out = ['base' => $base, 'checks' => []];

function addCheck(array &$out, string $id, bool $ok, array $extra = []): void
{
    $out['checks'][] = array_merge(['id' => $id, 'ok' => $ok], $extra);
}

$drafts = $backend . '/storage/patient-booking-drafts';
$exists = is_dir($drafts);
addCheck($out, 'storage_booking_drafts_dir', $exists, ['path' => $drafts]);

$wwwDataOk = false;
if ($exists) {
    $cmd = 'test -w ' . escapeshellarg($drafts);
    exec('sudo -u www-data ' . $cmd, $_, $code);
    $wwwDataOk = ($code === 0);
}
addCheck($out, 'booking_drafts_www_data_writable', $wwwDataOk);

try {
    $moduleConfig = new PharmacyModuleConfig($pdo);
    $cfg = $moduleConfig->getConfig();
    addCheck($out, 'pharmacy_module_enabled', !empty($cfg['module_enabled']), [
        'module_enabled' => !empty($cfg['module_enabled']),
        'ordering_nurse' => !empty($cfg['ordering_enabled_for_nurse']),
    ]);
} catch (Throwable $e) {
    addCheck($out, 'pharmacy_module_enabled', false, ['error' => $e->getMessage()]);
}

try {
    $labId = $pdo->query("SELECT id FROM profiles WHERE role = 'lab' ORDER BY created_at ASC LIMIT 1")->fetchColumn();
    if ($labId) {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM appointments WHERE assigned_lab_id = ?');
        $stmt->execute([(string) $labId]);
        $n = (int) $stmt->fetchColumn();
        addCheck($out, 'lab_appointments_sample', true, ['lab_id' => (string) $labId, 'count' => $n]);
    } else {
        addCheck($out, 'lab_appointments_sample', false, ['error' => 'no lab profile']);
    }
} catch (Throwable $e) {
    addCheck($out, 'lab_appointments_sample', false, ['error' => $e->getMessage()]);
}

$allOk = true;
foreach ($out['checks'] as $c) {
    if (empty($c['ok'])) {
        $allOk = false;
        break;
    }
}
$out['ok'] = $allOk;

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
exit($allOk ? 0 : 1);
