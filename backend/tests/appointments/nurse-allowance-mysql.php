<?php
declare(strict_types=1);
require_once __DIR__ . '/mysql-fixture.php';
require_once __DIR__ . '/../../lib/NurseMonthlyAllowance.php';
$admin = fixtureConnection();
$database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
$admin->exec('CREATE DATABASE `' . $database . '`');
$db = fixtureConnection($database);
$db->exec("SET time_zone='+00:00'");
$db->exec('CREATE TABLE appointments (id VARCHAR(64) PRIMARY KEY, assigned_nurse_id VARCHAR(64), status VARCHAR(32), scheduled_at DATETIME) ENGINE=InnoDB');
$db->exec('CREATE TABLE appointment_status_updates (appointment_id VARCHAR(64), actor_id VARCHAR(64), actor_role VARCHAR(32), status VARCHAR(32), created_at TIMESTAMP) ENGINE=InnoDB');
foreach (['september-end'=>'2026-09-30 21:59:59','october-start'=>'2026-09-30 22:00:00','october-end'=>'2026-10-31 22:59:59','november-start'=>'2026-10-31 23:00:00'] as $id=>$instant) {
    $db->prepare("INSERT INTO appointments VALUES (?,'fixture-nurse','confirmed','2026-12-15 09:00:00')")->execute([$id]);
    $db->prepare("INSERT INTO appointment_status_updates VALUES (?,'fixture-nurse','nurse','confirmed',?)")->execute([$id,$instant]);
}
$db->exec("INSERT INTO appointments VALUES ('legacy-october','fixture-nurse','confirmed','2026-10-31 23:59:59'),('legacy-november','fixture-nurse','confirmed','2026-11-01 00:00:00')");
$checks = 0;
$check = static function (bool $condition) use (&$checks): void { if (!$condition) throw new RuntimeException('France month regression ' . ($checks + 1)); $checks++; };
foreach (['+00:00','+04:00','-07:00'] as $connectionOffset) {
    $db->exec('SET time_zone=' . $db->quote($connectionOffset));
    foreach (['2026-09-15T12:00:00+02:00'=>1,'2026-10-15T12:00:00+02:00'=>3,'2026-11-15T12:00:00+01:00'=>2] as $now=>$expected) {
        $check(NurseMonthlyAllowance::count($db,'fixture-nurse',new DateTimeImmutable($now)) === $expected);
    }
}
$check(NurseMonthlyAllowance::count($db,'fixture-nurse',new DateTimeImmutable('2026-10-15T12:00:00+02:00'),'october-start') === 2);
$check(NurseMonthlyAllowance::count($db,'fixture-nurse',new DateTimeImmutable('2026-11-01T00:30:00+04:00')) === 3);
$check(NurseMonthlyAllowance::count($db,'fixture-nurse',new DateTimeImmutable('2026-10-01T00:30:00+04:00')) === 1);
echo "$checks MySQL assertions passed: TIMESTAMP acceptance history, France-local legacy dates, month edges and daylight-saving transition across three connection timezones.\n";
