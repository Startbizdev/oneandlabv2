<?php

/**
 * Corrige le type des RDV migrés : blood_test si labId/phlebotomistId/location=laboratoire,
 * nursing sinon. L'ancienne plateforme Labio n'avait que des prises de sang (lab ou domicile).
 *
 * Usage: php fix-appointment-types.php --data=../data/legacy-export.json [--dry-run]
 */

$options = getopt('', ['data:', 'dry-run']);
$dataPath = $options['data'] ?? null;
$dryRun = isset($options['dry-run']);

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php fix-appointment-types.php --data=/path/to/legacy-export.json [--dry-run]\n");
    exit(1);
}

require_once __DIR__ . '/config.php';

$config = require __DIR__ . '/config.php';
$dbConfig = $config['db'];
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $dbConfig['host'],
    $dbConfig['port'],
    $dbConfig['database']
);
$db = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$json = file_get_contents($dataPath);
$data = json_decode($json, true);
if (!$data) {
    fwrite(STDERR, "JSON invalide ou vide\n");
    exit(1);
}

$appointments = $data['appointments'] ?? [];

$labs = $data['laboratories'] ?? [];
$phlebotomists = $data['phlebotomists'] ?? [];
$professionals = $data['professionals'] ?? [];

$labMappingFiltered = [];
$stmt = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt->execute(['laboratories']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $labMappingFiltered[$row['legacy_object_id']] = $row['target_uuid'];
}

$phlebMappingFiltered = [];
$stmt->execute(['phlebotomists']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $phlebMappingFiltered[$row['legacy_object_id']] = $row['target_uuid'];
}

$profMappingFiltered = [];
$stmt->execute(['professionals']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $profMappingFiltered[$row['legacy_object_id']] = $row['target_uuid'];
}

$apptMapping = [];
$stmt2 = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt2->execute(['appointments']);
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    $apptMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$fixed = 0;
$errors = 0;

foreach ($appointments as $apt) {
    $legacyId = $apt['_id'] ?? '';
    if (empty($legacyId)) continue;

    $uuid = $apptMapping[$legacyId] ?? null;
    if (!$uuid) continue;

    $location = $apt['location'] ?? '';
    $hasLab = !empty($apt['labId']);
    $hasPhleb = !empty($apt['phlebotomistId']);
    $legacyType = $apt['type'] ?? '';

    if ($location === 'laboratoire' || $hasLab || $hasPhleb) {
        $type = 'blood_test';
    } else {
        $type = ($legacyType === 'laboratory') ? 'blood_test' : (($legacyType === 'homeVisit') ? 'nursing' : 'blood_test');
    }

    $labUuid = !empty($apt['labId']) ? ($labMappingFiltered[$apt['labId']] ?? null) : null;
    $phlebUuid = !empty($apt['phlebotomistId']) ? ($phlebMappingFiltered[$apt['phlebotomistId']] ?? null) : null;
    $profUuid = !empty($apt['professionalId']) ? ($profMappingFiltered[$apt['professionalId']] ?? null) : null;

    $assignedLabId = ($type === 'blood_test') ? $labUuid : null;
    $assignedTo = ($type === 'blood_test') ? $phlebUuid : (($type === 'nursing' && $profUuid) ? $profUuid : null);
    $assignedNurseId = ($type === 'nursing' && $profUuid) ? $profUuid : null;

    try {
        if (!$dryRun) {
            $stmt = $db->prepare('
                UPDATE appointments
                SET type = ?, form_type = ?, assigned_lab_id = ?, assigned_to = ?, assigned_nurse_id = ?
                WHERE id = ?
            ');
            $stmt->execute([$type, $type, $assignedLabId, $assignedTo, $assignedNurseId, $uuid]);
        }
        $fixed++;
    } catch (Exception $e) {
        fwrite(STDERR, "Erreur RDV $legacyId: " . $e->getMessage() . "\n");
        $errors++;
    }
}

fwrite(STDERR, "RDV corrigés (type + assignation): $fixed | Erreurs: $errors\n");
if ($dryRun) {
    fwrite(STDERR, "(dry-run, aucune modification)\n");
}
