<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/Logger.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->sqliteCreateFunction('NOW', static fn () => '2026-09-15 12:00:00');
$db->exec('CREATE TABLE access_logs (user_id TEXT, role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT)');
$resources = [];
for ($i = 0; $i < 503; $i++) $resources['synthetic-' . $i] = ['first_name', 'email'];
$logger = new Logger($db);
$logger->logDecryptBatch('synthetic-admin', 'super_admin', 'profile', $resources);
$logger->logDecryptBatch('synthetic-admin', 'super_admin', 'profile', []);
$rows = $db->query('SELECT * FROM access_logs')->fetchAll(PDO::FETCH_ASSOC);
if (count($rows) !== 503) throw new RuntimeException('Missing audit records across batch boundaries');
foreach ($rows as $row) {
    if ($row['user_id'] !== 'synthetic-admin' || $row['role'] !== 'super_admin'
        || $row['action'] !== 'decrypt' || $row['resource_type'] !== 'profile'
        || json_decode($row['details'], true)['fields'] !== $resources[$row['resource_id']]) {
        throw new RuntimeException('Audit attribution or fields changed');
    }
}
echo "503 individual audit records preserved across three batches; empty batch does not write.\n";
