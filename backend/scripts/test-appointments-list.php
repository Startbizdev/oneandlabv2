<?php

/**
 * Test local / serveur : liste RDV (sans HTTP) pour diagnostiquer 500.
 * Usage : php backend/scripts/test-appointments-list.php [role] [limit]
 */
declare(strict_types=1);

$roleFilter = $argv[1] ?? 'patient';
$limit = (int) ($argv[2] ?? 20);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/PendingOfferExpiry.php';
require_once __DIR__ . '/../models/Appointment.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $db->prepare('SELECT id, role FROM profiles WHERE role = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute([$roleFilter]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    fwrite(STDERR, "Aucun profil role={$roleFilter}\n");
    exit(1);
}

$userId = (string) $row['id'];
$role = (string) $row['role'];
echo "Test user {$userId} role={$role} limit={$limit}\n";

$ttlSql = PendingOfferExpiry::sqlCreatedWithinTtl('a');
echo "TTL SQL: {$ttlSql}\n";

$appointmentModel = new Appointment();

$sql = 'SELECT a.* FROM appointments a WHERE 1=1';
$params = [];
if ($role === 'patient') {
    $sql .= ' AND a.patient_id = ?';
    $params[] = $userId;
}
$sql .= ' ORDER BY a.scheduled_at DESC LIMIT ' . max(1, min($limit, 50));

$sel = $db->prepare($sql);
$sel->execute($params);
$rows = $sel->fetchAll(PDO::FETCH_ASSOC);
echo 'SQL rows: ' . count($rows) . "\n";

$decrypted = [];
foreach ($rows as $r) {
    try {
        $decrypted[] = $appointmentModel->decryptRowForList($r, $userId, $role);
    } catch (Throwable $e) {
        echo "decrypt fail {$r['id']}: {$e->getMessage()}\n";
    }
}
echo 'Decrypted: ' . count($decrypted) . "\n";

$payload = ['success' => true, 'data' => $decrypted];
$json = json_encode($payload, JSON_UNESCAPED_UNICODE);
if ($json === false) {
    echo 'json_encode FAILED: ' . json_last_error_msg() . "\n";
    exit(1);
}
echo 'json_bytes: ' . strlen($json) . " peak_mb=" . round(memory_get_peak_usage(true) / 1048576, 1) . "\n";
echo "OK\n";
