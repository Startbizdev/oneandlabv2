<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/NurseQuotaGuard.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec("CREATE TABLE profiles (id TEXT PRIMARY KEY, role TEXT); INSERT INTO profiles VALUES ('nurse-a','nurse'),('nurse-b','nurse'),('patient','patient')");
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, assigned_nurse_id TEXT, status TEXT, scheduled_at TEXT)');
$db->exec('CREATE TABLE appointment_status_updates (appointment_id TEXT, actor_id TEXT, actor_role TEXT, status TEXT, created_at TEXT)');
$now = new DateTimeImmutable('2026-09-15T12:00:00+02:00');
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Quota transaction regression: ' . ($checks + 1));
    $checks++;
};
$insert = $db->prepare('INSERT INTO appointments VALUES (?, ?, ?, ?)');
for ($i = 1; $i <= 9; $i++) $insert->execute(["accepted-$i", 'nurse-a', 'confirmed', '2026-09-16 08:00:00']);
$insert->execute(['batch-a', null, 'pending', '2026-10-15 08:00:00']);
$insert->execute(['batch-b', null, 'pending', '2026-10-15 08:00:00']);
$confirmBatch = static function () use ($db): string {
    $db->exec("UPDATE appointments SET status='confirmed', assigned_nurse_id='nurse-a' WHERE id IN ('batch-a','batch-b')");
    foreach (['batch-a','batch-b'] as $id) $db->prepare('INSERT INTO appointment_status_updates VALUES (?, ?, ?, ?, ?)')->execute([$id,'nurse-a','nurse','confirmed','2026-09-15 12:00:00']);
    return 'confirmed';
};
try { NurseQuotaGuard::run($db, 'nurse-a', 10, $confirmBatch, $now); $check(false); }
catch (NurseQuotaExceeded) { $check(true); }
$check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn() === 2);
$check((int)$db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn() === 0);
$check(!$db->inTransaction());
$db->exec("UPDATE appointments SET status='canceled' WHERE id='accepted-9'");
$check(NurseQuotaGuard::run($db, 'nurse-a', 10, $confirmBatch, $now) === 'confirmed');
$check(NurseMonthlyAllowance::count($db, 'nurse-a', $now) === 10);
$insert->execute(['reassign', 'nurse-b', 'confirmed', '2026-09-16 08:00:00']);
try {
    NurseQuotaGuard::run($db, 'nurse-a', 10, static fn () => $db->exec("UPDATE appointments SET assigned_nurse_id='nurse-a' WHERE id='reassign'"), $now);
    $check(false);
} catch (NurseQuotaExceeded) { $check(true); }
$check($db->query("SELECT assigned_nurse_id FROM appointments WHERE id='reassign'")->fetchColumn() === 'nurse-b');
NurseQuotaGuard::run($db, 'nurse-a', null, static fn () => $db->exec("UPDATE appointments SET assigned_nurse_id='nurse-a' WHERE id='reassign'"), $now);
$check(NurseMonthlyAllowance::count($db, 'nurse-a', $now) === 11);
try { NurseQuotaGuard::run($db, 'patient', null, static fn () => null, $now); $check(false); }
catch (DomainException) { $check(true); }
$db->beginTransaction();
$db->exec("UPDATE appointments SET status='canceled' WHERE id='accepted-1'");
$nestedOperationRan = false;
try {
    NurseQuotaGuard::run($db, 'nurse-a', 10, static function () use ($db, &$nestedOperationRan): void {
        $nestedOperationRan = true;
        $db->exec("UPDATE appointments SET status='confirmed' WHERE id='accepted-9'");
    }, $now);
    $check(false);
} catch (LogicException $error) { $check(str_contains($error->getMessage(), 'nouvelle transaction')); }
$check(!$nestedOperationRan);
$check($db->inTransaction());
$check($db->query("SELECT status FROM appointments WHERE id='accepted-1'")->fetchColumn() === 'canceled');
$check($db->query("SELECT status FROM appointments WHERE id='accepted-9'")->fetchColumn() === 'canceled');
$db->rollBack();
echo "$checks assertions passed: whole batch rollback, acceptance-month quota, successful retry, reassignment rollback, unlimited plan and rejection of a pre-existing snapshot.\n";
