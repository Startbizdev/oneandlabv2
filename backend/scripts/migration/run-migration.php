<?php

/**
 * Orchestrateur de migration legacy → cible
 * Usage: php run-migration.php --data=../data/legacy-export.json --uploads=../data/legacy-uploads [--dry-run]
 */

$options = getopt('', ['data:', 'uploads:', 'dry-run']);
$dataPath = $options['data'] ?? null;
$uploadsPath = $options['uploads'] ?? null;
$dryRun = isset($options['dry-run']);

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php run-migration.php --data=/path/to/legacy-export.json --uploads=/path/to/legacy-uploads [--dry-run]\n");
    exit(1);
}

$uploadsPath = $uploadsPath ?: dirname($dataPath) . '/legacy-uploads';
if (!is_dir($uploadsPath)) {
    fwrite(STDERR, "Dossier uploads legacy introuvable: $uploadsPath\n");
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/MigrateProfiles.php';
require_once __DIR__ . '/MigrateRelatives.php';
require_once __DIR__ . '/MigrateAppointments.php';
require_once __DIR__ . '/MigrateDocuments.php';

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

// Exécuter migration 046 si nécessaire
$tableExists = $db->query("SHOW TABLES LIKE 'legacy_id_mapping'")->rowCount() > 0;
if (!$tableExists) {
    $migrationPath = dirname(__DIR__, 3) . '/database/migrations/046_create_legacy_id_mapping.sql';
    if (file_exists($migrationPath)) {
        $sql = file_get_contents($migrationPath);
        $db->exec($sql);
        fwrite(STDERR, "Migration 046 exécutée (legacy_id_mapping)\n");
    }
}

$json = file_get_contents($dataPath);
$data = json_decode($json, true);
if (!$data) {
    fwrite(STDERR, "JSON invalide ou vide\n");
    exit(1);
}

$labs = $data['laboratories'] ?? [];
$phlebotomists = $data['phlebotomists'] ?? [];
$professionals = $data['professionals'] ?? [];
$patients = $data['patients'] ?? [];
$relatives = $data['relatives'] ?? [];
$users = $data['users'] ?? [];
$appointments = $data['appointments'] ?? [];

$uploadsBasePath = $config['uploads_path'] ?? dirname(__DIR__, 2) . '/uploads/medical/';

$migrateProfiles = new MigrateProfiles($db, $legacyKey, $dryRun);

// 1) Labs
$labMapping = [];
foreach ($labs as $lab) {
    $uuid = $migrateProfiles->migrateLab($lab);
    if ($uuid) {
        $labMapping[$lab['_id'] ?? ''] = $uuid;
    }
}
fwrite(STDERR, "Labs migrés: " . count($labMapping) . "\n");

// 2) Phlebotomists
$phlebMapping = [];
foreach ($phlebotomists as $phleb) {
    $uuid = $migrateProfiles->migratePhlebotomist($phleb, $labMapping);
    if ($uuid) {
        $phlebMapping[$phleb['_id'] ?? ''] = $uuid;
    }
}
fwrite(STDERR, "Préleveurs migrés: " . count($phlebMapping) . "\n");

// 3) Professionals (nurse vs pro selon specialty déchiffrée + emploi depuis specialty)
$profMapping = [];
foreach ($professionals as $prof) {
    $uuid = $migrateProfiles->migrateProfessional($prof);
    if ($uuid) {
        $profMapping[$prof['_id'] ?? ''] = $uuid;
    }
}
fwrite(STDERR, "Professionnels migrés: " . count($profMapping) . "\n");

// 4) Patients
$patientMapping = [];
foreach ($patients as $patient) {
    $createdBy = $patient['professionalId'] ?? null;
    $createdByUuid = $createdBy && isset($profMapping[$createdBy]) ? $profMapping[$createdBy] : null;
    $uuid = $migrateProfiles->migratePatient($patient, $createdByUuid);
    if ($uuid) {
        $patientMapping[$patient['_id'] ?? ''] = $uuid;
    }
}
fwrite(STDERR, "Patients migrés: " . count($patientMapping) . "\n");

// 5) User → Profile mapping (pour createdBy dans appointments)
$userToProfileMapping = [];
foreach ($users as $u) {
    $userId = $u['_id'] ?? '';
    $role = $u['role'] ?? '';
    $roleDetailsId = $u['roleDetailsId'] ?? null;
    $model = $u['roleDetailsModel'] ?? '';

    $profileUuid = null;
    $profileRole = 'patient';
    if ($role === 'lab_admin' && $model === 'Laboratory' && $roleDetailsId && isset($labMapping[$roleDetailsId])) {
        $profileUuid = $labMapping[$roleDetailsId];
        $profileRole = 'lab';
    } elseif ($role === 'phlebotomist' && $roleDetailsId && isset($phlebMapping[$roleDetailsId])) {
        $profileUuid = $phlebMapping[$roleDetailsId];
        $profileRole = 'preleveur';
    } elseif ($role === 'professional' && $roleDetailsId && isset($profMapping[$roleDetailsId])) {
        $profileUuid = $profMapping[$roleDetailsId];
        $profileRole = 'nurse'; // ou pro selon specialty, on garde nurse par défaut
    } elseif ($role === 'patient') {
        foreach ($patients as $p) {
            if (($p['userId'] ?? '') === $userId) {
                $profileUuid = $patientMapping[$p['_id'] ?? ''] ?? null;
                break;
            }
        }
        $profileRole = 'patient';
    }
    if ($profileUuid) {
        $userToProfileMapping[$userId] = ['uuid' => $profileUuid, 'role' => $profileRole];
    }
}
fwrite(STDERR, "User→Profile mappés: " . count($userToProfileMapping) . "\n");

// 6) Relatives
$migrateRelatives = new MigrateRelatives($db, $legacyKey, $dryRun);
$relativeMapping = [];
foreach ($relatives as $rel) {
    $uuid = $migrateRelatives->migrate($rel, $patientMapping);
    if ($uuid) {
        $relativeMapping[$rel['_id'] ?? ''] = $uuid;
    }
}
fwrite(STDERR, "Relatives migrés: " . count($relativeMapping) . "\n");

// 7) Appointments + Documents
$migrateAppointments = new MigrateAppointments($db, $legacyKey, $dryRun);
$migrateDocuments = new MigrateDocuments(
    $db,
    $legacyKey,
    rtrim($uploadsPath, '/'),
    rtrim($uploadsBasePath, '/'),
    $dryRun
);

$report = [];
$reportPath = dirname($dataPath) . '/migration-report.json';

foreach ($appointments as $apt) {
    $legacyId = $apt['_id'] ?? '';
    $entry = [
        'appointment_legacy_id' => $legacyId,
        'appointment_uuid' => null,
        'status' => 'success',
        'issues' => [],
        'duplicates' => [],
        'documents_migrated' => 0,
        'documents_missing' => 0,
        'fields_unmapped' => [],
        'notes' => '',
    ];

    $result = $migrateAppointments->migrate(
        $apt,
        $patientMapping,
        $relativeMapping,
        $labMapping,
        $phlebMapping,
        $profMapping,
        $userToProfileMapping,
        $patients,
        $relatives
    );

    if (!$result) {
        $entry['status'] = 'error';
        $entry['issues'][] = 'Appointment non migré (patient/relative manquant)';
        $report[] = $entry;
        continue;
    }

    $entry['appointment_uuid'] = $result['uuid'];
    $appointmentUuid = $result['uuid'];
    $formData = $result['form_data'] ?? [];
    $createdByUuid = $result['created_by'] ?? $result['patient_id'] ?? null;

    $uploadedByProfile = $createdByUuid ?? $result['patient_id'] ?? null;
    if (!$uploadedByProfile) {
        $uploadedByProfile = $patientMapping[$apt['patientId'] ?? ''] ?? null;
    }

    $docFields = ['prescriptionFile', 'carteVitaleFile', 'mutuelleFile', 'attestationFile', 'analysisResults'];
    foreach ($docFields as $field) {
        $fileMeta = $formData[$field] ?? $apt[$field] ?? null;
        if (!$uploadedByProfile) {
            $entry['issues'][] = "uploaded_by manquant, documents non migrés";
            break;
        }
        $docResult = $migrateDocuments->migrateDocument(
            $field,
            $fileMeta,
            $appointmentUuid,
            $uploadedByProfile
        );
        if ($docResult) {
            if (($docResult['status'] ?? '') === 'migrated') {
                $entry['documents_migrated']++;
            } elseif (($docResult['status'] ?? '') === 'missing') {
                $entry['documents_missing']++;
            }
            /* skipped = déjà migré, on ne compte pas */
        }
    }

    $report[] = $entry;
}

$successCount = count(array_filter($report, fn($r) => ($r['status'] ?? '') === 'success'));
$errorCount = count(array_filter($report, fn($r) => ($r['status'] ?? '') === 'error'));
$totalDocs = array_sum(array_column($report, 'documents_migrated'));

fwrite(STDERR, "RDV migrés: $successCount | Erreurs: $errorCount | Documents: $totalDocs\n");

$reportDir = dirname($reportPath);
if (!is_dir($reportDir)) {
    mkdir($reportDir, 0755, true);
}
if (!$dryRun) {
    file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    fwrite(STDERR, "Rapport: $reportPath\n");
}

fwrite(STDERR, "Migration terminée.\n");
