<?php

/**
 * Vérifie que les RDV assignés à un labo en legacy sont bien assignés au bon labo sur AWS.
 *
 * Usage: php verify-lab-assignments.php --data=../data/legacy-export.json
 */

$options = getopt('', ['data:']);
$dataPath = $options['data'] ?? null;

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php verify-lab-assignments.php --data=/path/to/legacy-export.json\n");
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
    fwrite(STDERR, "JSON invalide\n");
    exit(1);
}

$labs = $data['laboratories'] ?? [];
$appointments = $data['appointments'] ?? [];

$labMapping = [];
$stmt = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt->execute(['laboratories']);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $labMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$labIdsFromLabs = array_column($labs, '_id');
$labMappingFiltered = [];
foreach ($labIdsFromLabs as $lid) {
    if (isset($labMapping[$lid])) {
        $labMappingFiltered[$lid] = $labMapping[$lid];
    }
}

$apptMapping = [];
$stmt2 = $db->prepare('SELECT legacy_object_id, target_uuid FROM legacy_id_mapping WHERE legacy_collection = ?');
$stmt2->execute(['appointments']);
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    $apptMapping[$row['legacy_object_id']] = $row['target_uuid'];
}

$labNames = [];
foreach ($labs as $l) {
    $labNames[$l['_id']] = $l['name'] ?? $l['_id'];
}

$ok = 0;
$ko = 0;
$noMapping = 0;
$errors = [];

foreach ($appointments as $apt) {
    $legacyId = $apt['_id'] ?? '';
    $legacyLabId = $apt['labId'] ?? null;
    if (empty($legacyLabId)) continue;

    $aptUuid = $apptMapping[$legacyId] ?? null;
    if (!$aptUuid) {
        $noMapping++;
        continue;
    }

    $expectedLabUuid = $labMappingFiltered[$legacyLabId] ?? null;
    if (!$expectedLabUuid) {
        $errors[] = [
            'apt' => $legacyId,
            'apt_uuid' => $aptUuid,
            'legacy_lab_id' => $legacyLabId,
            'issue' => 'Lab legacy non mappé',
        ];
        $ko++;
        continue;
    }

    $stmt = $db->prepare('SELECT id, assigned_lab_id, type FROM appointments WHERE id = ?');
    $stmt->execute([$aptUuid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        $errors[] = ['apt' => $legacyId, 'issue' => 'RDV introuvable en base'];
        $ko++;
        continue;
    }

    $actualLabUuid = $row['assigned_lab_id'] ?? null;
    if ($actualLabUuid !== $expectedLabUuid) {
        $labName = $labNames[$legacyLabId] ?? $legacyLabId;
        $errors[] = [
            'apt' => $legacyId,
            'apt_uuid' => $aptUuid,
            'legacy_lab_id' => $legacyLabId,
            'lab_name' => $labName,
            'expected_uuid' => $expectedLabUuid,
            'actual_uuid' => $actualLabUuid,
            'issue' => 'Mauvais labo assigné',
        ];
        $ko++;
    } else {
        $ok++;
    }
}

$totalWithLab = $ok + $ko;
fwrite(STDERR, "\n=== Vérification assignation labos ===\n");
fwrite(STDERR, "RDV avec labId en legacy: $totalWithLab\n");
fwrite(STDERR, "OK (bon labo): $ok\n");
fwrite(STDERR, "KO (mauvais ou manquant): $ko\n");
fwrite(STDERR, "Sans mapping appointment: $noMapping\n\n");

if (!empty($errors)) {
    fwrite(STDERR, "Erreurs détaillées (max 20):\n");
    foreach (array_slice($errors, 0, 20) as $e) {
        fwrite(STDERR, "  - RDV legacy {$e['apt']}: {$e['issue']}\n");
        if (!empty($e['expected_uuid'])) {
            fwrite(STDERR, "    Attendu: {$e['expected_uuid']}, Actuel: " . ($e['actual_uuid'] ?? 'NULL') . "\n");
        }
    }
    if (count($errors) > 20) {
        fwrite(STDERR, "  ... et " . (count($errors) - 20) . " autres\n");
    }
}

echo json_encode([
    'total_with_lab' => $totalWithLab,
    'ok' => $ok,
    'ko' => $ko,
    'no_mapping' => $noMapping,
    'errors' => array_slice($errors, 0, 50),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
