<?php

/**
 * Corrige le nom d'affichage du labo Labio principal.
 * Le profil a été fusionné avec "Laboratoire Test" (setup) car même email lab@oneandlab.fr.
 * On met à jour company_name pour afficher "LABIO" au lieu de "Laboratoire Test".
 *
 * Usage: php fix-lab-display-name.php [--dry-run]
 */

$options = getopt('', ['dry-run']);
$dryRun = isset($options['dry-run']);

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

// Labio principal legacy ID (689233af... = Plan-de-Cuques, 871 RDV)
$labioLegacyId = '689233af3b78f462d126e06a';
$stmt = $db->prepare('SELECT target_uuid FROM legacy_id_mapping WHERE legacy_collection = ? AND legacy_object_id = ?');
$stmt->execute(['laboratories', $labioLegacyId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$profileUuid = $row['target_uuid'] ?? null;

if (!$profileUuid) {
    fwrite(STDERR, "Labio principal non trouvé dans legacy_id_mapping\n");
    exit(1);
}

$newCompanyName = 'Laboratoire LABIO';

require_once dirname(__DIR__, 2) . '/lib/Crypto.php';
$crypto = new Crypto();
$encrypted = $crypto->encryptField($newCompanyName);

if (!$dryRun) {
    $update = $db->prepare('UPDATE profiles SET company_name_encrypted = ?, company_name_dek = ? WHERE id = ? AND role = ?');
    $update->execute([$encrypted['encrypted'], $encrypted['dek'], $profileUuid, 'lab']);
    $n = $update->rowCount();
    fwrite(STDERR, "Profil $profileUuid mis à jour: company_name = \"$newCompanyName\" ($n ligne(s))\n");
} else {
    fwrite(STDERR, "[DRY-RUN] Mise à jour profil $profileUuid: company_name = \"$newCompanyName\"\n");
}
