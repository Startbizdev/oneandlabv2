<?php

/**
 * Corrige created_by sur les patients migrés dont le pro/infirmier créateur n'a pas été conservé.
 * À exécuter après la migration pour que les pros et infirmiers retrouvent leurs patients dans leur dashboard.
 *
 * Usage: php fix-patient-created-by.php --data=/chemin/vers/legacy-export.json [--dry-run]
 * Ex: php fix-patient-created-by.php --data=../../../data/legacy-export.json --dry-run
 */

$options = getopt('', ['data:', 'dry-run']);
$dataPath = $options['data'] ?? null;
$dryRun = isset($options['dry-run']);

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php fix-patient-created-by.php --data=/path/to/legacy-export.json [--dry-run]\n");
    exit(1);
}

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

$patients = $data['patients'] ?? [];
$professionals = $data['professionals'] ?? [];

// Mapping professional legacy_id -> uuid
$profMapping = [];
$stmt = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt->execute(['professionals']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $profMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

// Mapping patient legacy_id -> profile uuid
$patientMapping = [];
$stmt2 = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt2->execute(['patients']);
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    $patientMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$fixed = 0;
$skipped = 0;
$errors = 0;

foreach ($patients as $patient) {
    $legacyPatientId = $patient['_id'] ?? '';
    $professionalId = $patient['professionalId'] ?? null;
    if (empty($legacyPatientId) || empty($professionalId)) {
        $skipped++;
        continue;
    }

    $profileUuid = $patientMapping[$legacyPatientId] ?? null;
    $profUuid = $profMapping[$professionalId] ?? null;
    if (!$profileUuid || !$profUuid) {
        $skipped++;
        continue;
    }

    // Vérifier si le profil a déjà created_by
    $check = $db->prepare('SELECT id, created_by FROM profiles WHERE id = ? AND role = ?');
    $check->execute([$profileUuid, 'patient']);
    $row = $check->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        $skipped++;
        continue;
    }
    if (!empty($row['created_by'])) {
        $skipped++;
        continue; // Déjà assigné
    }

    try {
        if (!$dryRun) {
            $update = $db->prepare('UPDATE profiles SET created_by = ? WHERE id = ?');
            $update->execute([$profUuid, $profileUuid]);
        }
        $fixed++;
    } catch (Exception $e) {
        fwrite(STDERR, "Erreur patient $legacyPatientId: " . $e->getMessage() . "\n");
        $errors++;
    }
}

fwrite(STDERR, "Patients corrigés (created_by): $fixed | Ignorés: $skipped | Erreurs: $errors\n");
if ($dryRun) {
    fwrite(STDERR, "(dry-run, aucune modification)\n");
}
