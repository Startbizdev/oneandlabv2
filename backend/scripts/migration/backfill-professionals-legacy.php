<?php

/**
 * Backfill profiles.emploi + correction rôle pro/nurse pour les professionnels déjà migrés.
 * Utilise legacy-export.json + legacy_id_mapping + la même logique que MigrateProfiles::migrateProfessional.
 *
 * Usage:
 *   php backfill-professionals-legacy.php --data=/path/to/legacy-export.json [--dry-run] [--force-emploi] [--no-fix-roles]
 */

$options = getopt('', ['data:', 'dry-run', 'force-emploi', 'no-fix-roles']);
$dataPath = $options['data'] ?? null;
$dryRun = isset($options['dry-run']);
$forceEmploi = isset($options['force-emploi']);
$fixRoles = !isset($options['no-fix-roles']);

if (!$dataPath || !file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php backfill-professionals-legacy.php --data=/path/to/legacy-export.json [--dry-run] [--force-emploi] [--no-fix-roles]\n");
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/MigrateProfiles.php';

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

$professionals = $data['professionals'] ?? [];

$migrate = new MigrateProfiles($db, $legacyKey, false);
$stats = $migrate->backfillProfessionalsFromLegacy($professionals, $dryRun, $forceEmploi, $fixRoles);

if ($dryRun) {
    fwrite(STDERR, "[dry-run] Aucune écriture en base.\n");
}
fwrite(STDERR, sprintf(
    "Professionnels dans le JSON: %d\nemploi mis à jour: %d\nrôle (pro/nurse) corrigé: %d\ninchangés: %d\nsans mapping legacy: %d\nprofil SQL manquant (orphelin): %d\n",
    count($professionals),
    $stats['updated_emploi'],
    $stats['updated_roles'],
    $stats['unchanged'],
    $stats['missing_mapping'],
    $stats['orphan_profile']
));
