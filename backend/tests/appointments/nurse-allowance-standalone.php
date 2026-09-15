<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/NurseMonthlyAllowance.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, assigned_nurse_id TEXT, status TEXT, scheduled_at TEXT)');
$db->exec('CREATE TABLE appointment_status_updates (appointment_id TEXT, actor_id TEXT, actor_role TEXT, status TEXT, created_at TEXT)');
$now = new DateTimeImmutable('2026-09-15T12:00:00+02:00');
$count = static fn (?string $exclude = null): int => NurseMonthlyAllowance::count($db, 'nurse-a', $now, $exclude);
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Nurse allowance regression: ' . ($checks + 1));
    $checks++;
};
$check($count() === 0);
$insert = $db->prepare('INSERT INTO appointments VALUES (?, ?, ?, ?)');
for ($i = 1; $i <= 9; $i++) $insert->execute(["accepted-$i", 'nurse-a', 'confirmed', '2026-09-16 08:00:00']);
$check($count() === 9);
$insert->execute(['pending', 'nurse-a', 'pending', '2026-09-16 08:00:00']);
$check($count() === 9);
$db->exec("UPDATE appointments SET status = 'confirmed' WHERE id = 'pending'");
$check($count() === 10);
$check($count('pending') === 9);
foreach (['canceled', 'refused', 'expired'] as $status) $insert->execute([$status, 'nurse-a', $status, '2026-09-16 08:00:00']);
$check($count() === 10);
$insert->execute(['other-nurse', 'nurse-b', 'confirmed', '2026-09-16 08:00:00']);
$check($count() === 10);
$db->exec("INSERT INTO appointment_status_updates VALUES ('accepted-1', 'nurse-a', 'nurse', 'confirmed', '2026-08-31 23:59:59')");
$check($count() === 9);
$insert->execute(['accepted-future', 'nurse-a', 'confirmed', '2026-10-15 08:00:00']);
$db->exec("INSERT INTO appointment_status_updates VALUES ('accepted-future', 'nurse-a', 'nurse', 'confirmed', '2026-09-15 08:00:00')");
$check($count() === 10);
$db->exec("INSERT INTO appointment_status_updates VALUES ('accepted-future', 'nurse-a', 'nurse', 'confirmed', '2026-09-16 08:00:00')");
$check($count() === 10);
$check(NurseMonthlyAllowance::count($db, 'nurse-a', new DateTimeImmutable('2026-10-01T00:30:00+04:00')) === 10);
$insert->execute(['next-month', 'nurse-a', 'confirmed', '2026-10-01 00:00:00']);
$check($count() === 10);
echo "$checks assertions passed: pending requests, exact quota, repeat confirmations, historical acceptance and France month boundaries.\n";
