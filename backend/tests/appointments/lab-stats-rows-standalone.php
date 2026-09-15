<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/LabStatsAppointmentRows.php';

$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('CREATE TABLE appointments (
    id TEXT PRIMARY KEY, type TEXT, status TEXT, scheduled_at TEXT, created_at TEXT,
    duration_minutes INTEGER, started_at TEXT, completed_at TEXT, assigned_lab_id TEXT,
    merged_into_appointment_id TEXT, form_data_encrypted TEXT, address_encrypted TEXT
)');
$insert = $db->prepare("INSERT INTO appointments VALUES (?, ?, 'completed', ?, '2026-10-01', 15, NULL, NULL, ?, ?, 'synthetic-medical-form', 'synthetic-address')");
foreach ([
    ['parent', 'blood_test', '2026-10-15 09:15:00', 'lab', null],
    ['merged', 'blood_test', '2026-10-15 09:15:00', 'lab', 'parent'],
    ['team', 'blood_test', '2026-10-16 09:15:00', 'preleveur', null],
    ['unrelated', 'blood_test', '2026-10-17 09:15:00', 'outside', null],
    ['nursing', 'nursing', '2026-10-17 09:15:00', 'lab', null],
] as $row) $insert->execute($row);
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Lab statistics regression ' . ($checks + 1));
    ++$checks;
};
$detailCalls = 0;
$loadDetails = static function (string $id) use (&$detailCalls): array {
    ++$detailCalls;
    return ['id' => $id, 'detail_loaded' => true];
};
$summary = LabStatsAppointmentRows::load($db, ['lab', 'preleveur', 'lab'], true, $loadDetails);
$check($detailCalls === 0);
$check(array_column($summary, 'id') === ['team', 'parent']);
$check(count($summary) === 2);
$check(!array_key_exists('form_data_encrypted', $summary[0]));
$check(!array_key_exists('address_encrypted', $summary[0]));
$check($summary[1]['scheduled_at'] === '2026-10-15 09:15:00');
$check($summary[1]['duration_minutes'] === 15);
$details = LabStatsAppointmentRows::load($db, ['lab', 'preleveur'], false, $loadDetails);
$check($detailCalls === 2);
$check(array_column($details, 'id') === ['team', 'parent']);
$check($details[0]['detail_loaded'] === true);
$check(LabStatsAppointmentRows::load($db, [], true, $loadDetails) === []);
$check(LabStatsAppointmentRows::load($db, ["lab') OR 1=1 --"], true, $loadDetails) === []);
$fallback = LabStatsAppointmentRows::load($db, ['lab'], false, static function (): never { throw new RuntimeException('Unreadable historical fixture'); });
$check(count($fallback) === 1 && $fallback[0]['id'] === 'parent');
$check($fallback[0]['status'] === 'completed');
$check(!array_key_exists('form_data_encrypted', $fallback[0]));
$check(LabStatsAppointmentRows::load($db, ['lab'], false, static fn() => null) === []);
echo "$checks lab statistics assertions passed: team scope, merged records, summary without clinical hydration, detail compatibility and fallback.\n";
