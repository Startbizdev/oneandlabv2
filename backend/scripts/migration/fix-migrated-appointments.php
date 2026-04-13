<?php

/**
 * Correctif des RDV déjà migrés : met à jour form_data et address avec les données
 * patient/relative de l'export legacy (first_name, last_name, email, phone, birth_date,
 * address_complement, adresse en label uniquement).
 *
 * Usage: php fix-migrated-appointments.php --data=../data/legacy-export.json [--dry-run]
 */

$options = getopt('', ['data:', 'dry-run']);
$dataPath = $options['data'] ?? null;
$dryRun = isset($options['dry-run']);

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php fix-migrated-appointments.php --data=/path/to/legacy-export.json [--dry-run]\n");
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/MigrateAppointments.php';

$config = require __DIR__ . '/config.php';
$legacyKey = $config['legacy_encryption_key'] ?? '';
if (empty($legacyKey)) {
    fwrite(STDERR, "LEGACY_ENCRYPTION_KEY ou ENCRYPTION_KEY requis dans .env\n");
    exit(1);
}

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
$relatives = $data['relatives'] ?? [];
$professionals = $data['professionals'] ?? [];
$appointments = $data['appointments'] ?? [];

$migrateAppointments = new MigrateAppointments($db, $legacyKey, $dryRun);

$profMapping = [];
$stmt = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt->execute(['profiles']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $profMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$apptMapping = [];
$stmt2 = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt2->execute(['appointments']);
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    $apptMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$profMappingByProfId = [];
foreach ($professionals as $p) {
    $lid = $p['_id'] ?? '';
    if ($lid && isset($profMapping[$lid])) {
        $profMappingByProfId[$lid] = $profMapping[$lid];
    }
}

$fixed = 0;
$skipped = 0;
$errors = 0;

foreach ($appointments as $apt) {
    $legacyId = $apt['_id'] ?? '';
    if (empty($legacyId)) {
        $skipped++;
        continue;
    }

    $uuid = $apptMapping[$legacyId] ?? null;
    if (!$uuid) {
        $skipped++;
        continue;
    }

    try {
        $built = $migrateAppointments->buildFormDataAndAddress(
            $apt,
            $profMappingByProfId,
            $patients,
            $relatives
        );
        if (!$built) {
            $skipped++;
            continue;
        }

        if (!$dryRun) {
            $stmt = $db->prepare('
                UPDATE appointments
                SET address_encrypted = ?, address_dek = ?, form_data_encrypted = ?, form_data_dek = ?
                WHERE id = ?
            ');
            $stmt->execute([
                $built['address_encrypted'],
                $built['address_dek'],
                $built['form_data_encrypted'],
                $built['form_data_dek'],
                $uuid,
            ]);
        }
        $fixed++;
    } catch (Exception $e) {
        fwrite(STDERR, "Erreur RDV $legacyId: " . $e->getMessage() . "\n");
        $errors++;
    }
}

fwrite(STDERR, "RDV corrigés: $fixed | Ignorés: $skipped | Erreurs: $errors\n");
if ($dryRun) {
    fwrite(STDERR, "(dry-run, aucune modification)\n");
}
