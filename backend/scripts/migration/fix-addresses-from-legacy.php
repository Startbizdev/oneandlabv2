<?php

/**
 * Corrige les adresses des profils en utilisant les données du legacy-export.json
 * - Match via legacy_id_mapping (patients -> profiles)
 * - Décrypte l'adresse legacy, retire le préfixe "nom prénom" si présent
 * - Ajoute le complément (addressDetails, floor, accessCode) dans address.complement
 * - Ignore les adresses qui sont des emails (@)
 *
 * Usage: php fix-addresses-from-legacy.php --data=../../data/legacy-export.json [--dry-run]
 * Serveur: cd /var/www/oneandlab/backend && php scripts/migration/fix-addresses-from-legacy.php --data=../data/legacy-export.json
 */

$options = getopt('', ['data:', 'dry-run']);
$dataPath = $options['data'] ?? __DIR__ . '/../../data/legacy-export.json';
$dryRun = isset($options['dry-run']);

if (!file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php fix-addresses-from-legacy.php --data=/path/to/legacy-export.json [--dry-run]\n");
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/LegacyCrypto.php';
require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/lib/Crypto.php';

$config = require __DIR__ . '/config.php';
$legacyKey = $config['legacy_encryption_key'] ?? '';
if (empty($legacyKey)) {
    fwrite(STDERR, "LEGACY_ENCRYPTION_KEY requis\n");
    exit(1);
}

$dbConfig = require dirname(__DIR__, 2) . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $dbConfig['host'], $dbConfig['port'], $dbConfig['database']);
$db = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$crypto = new Crypto();

function decryptLegacy(?string $v, string $key): string {
    if ($v === null || $v === '') return '';
    if (LegacyCrypto::isEncrypted($v)) {
        try { return LegacyCrypto::decrypt($v, $key); } catch (Exception $e) { return ''; }
    }
    return $v;
}

function cleanAddressLabel(string $label, string $firstName, string $lastName): string {
    $label = trim($label);
    $fn = trim($firstName);
    $ln = trim($lastName);
    if ($fn === '' || $ln === '') return $label;
    $p1 = $ln . ' ' . $fn;
    $p2 = $fn . ' ' . $ln;
    $labelL = mb_strtolower($label);
    $p1L = mb_strtolower($p1);
    $p2L = mb_strtolower($p2);
    if (strlen($p1L) > 0 && str_starts_with($labelL, $p1L)) {
        $r = trim(mb_substr($label, mb_strlen($p1)));
        return $r !== '' ? $r : $label;
    }
    if (strlen($p2L) > 0 && str_starts_with($labelL, $p2L)) {
        $r = trim(mb_substr($label, mb_strlen($p2)));
        return $r !== '' ? $r : $label;
    }
    return $label;
}

$json = file_get_contents($dataPath);
$data = json_decode($json, true);
$patients = $data['patients'] ?? [];

$stmtMapping = $db->prepare('SELECT target_uuid FROM legacy_id_mapping WHERE legacy_collection = ? AND legacy_object_id = ?');
$stmtUpdate = $db->prepare('UPDATE profiles SET address_encrypted = ?, address_dek = ? WHERE id = ?');

$updated = 0;
$skipped = 0;

foreach ($patients as $p) {
    $legacyId = $p['_id'] ?? '';
    if ($legacyId === '') continue;

    $email = decryptLegacy($p['email'] ?? '', $legacyKey);
    $firstName = decryptLegacy($p['firstName'] ?? '', $legacyKey);
    $lastName = decryptLegacy($p['lastName'] ?? '', $legacyKey);
    $addressRaw = decryptLegacy($p['address'] ?? '', $legacyKey);

    if (trim($addressRaw) === '') continue;
    if (strpos($addressRaw, '@') !== false) continue; // email stocké par erreur

    $addressClean = cleanAddressLabel($addressRaw, $firstName, $lastName);

    // Complément : addressDetails, floor, accessCode (comme dans les RDV)
    $addrParts = array_filter([
        trim(decryptLegacy($p['addressDetails'] ?? '', $legacyKey)),
        trim(decryptLegacy($p['floor'] ?? '', $legacyKey)),
        trim(decryptLegacy($p['accessCode'] ?? '', $legacyKey)),
    ]);
    $complement = implode(', ', $addrParts);

    $stmtMapping->execute(['patients', $legacyId]);
    $row = $stmtMapping->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        $skipped++;
        continue;
    }
    $profileUuid = $row['target_uuid'];

    $addressObj = ['label' => $addressClean];
    if ($complement !== '') {
        $addressObj['complement'] = $complement;
    }
    $addressJson = json_encode($addressObj);
    $enc = $crypto->encryptField($addressJson);

    if (!$dryRun) {
        $stmtUpdate->execute([$enc['encrypted'], $enc['dek'], $profileUuid]);
    }
    $updated++;
    $complStr = $complement !== '' ? " | complément: {$complement}" : '';
    echo ($dryRun ? '[DRY] ' : '') . "{$profileUuid} ({$email}): \"{$addressRaw}\" → \"{$addressClean}\"{$complStr}\n";
}

echo "\nCorrigés: {$updated} | Ignorés (pas de mapping): {$skipped}\n";
if ($dryRun && $updated > 0) {
    echo "Relancez sans --dry-run pour appliquer.\n";
}
