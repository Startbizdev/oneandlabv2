#!/usr/bin/env php
<?php
/**
 * Remplit profiles.phone_digits_hash pour les patients après migration 060.
 *
 * Usage:
 *   php backend/scripts/backfill-phone-digits-hash.php
 *   php backend/scripts/backfill-phone-digits-hash.php --dry-run
 */

$dry = in_array('--dry-run', $argv, true);

$backendDir = dirname(__DIR__);

require_once $backendDir . '/config/database.php';
require_once $backendDir . '/lib/Crypto.php';
require_once $backendDir . '/models/User.php';

$userModel = new User();

$ref = new ReflectionClass(User::class);
$m = $ref->getMethod('hasPhoneDigitsHashColumn');
$m->setAccessible(true);
if (!$m->invoke($userModel)) {
    fwrite(STDERR, "Colonne phone_digits_hash absente — appliquer database/migrations/060_profiles_phone_digits_hash.sql\n");
    exit(1);
}

$config = require $backendDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$stmt = $db->query("
    SELECT id, phone_encrypted, phone_dek
    FROM profiles
    WHERE role = 'patient' AND phone_encrypted IS NOT NULL AND phone_dek IS NOT NULL
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$n = 0;
$skipped = 0;
foreach ($rows as $row) {
    $plain = '';
    try {
        $plain = $crypto->decryptField($row['phone_encrypted'], $row['phone_dek']);
    } catch (Throwable $e) {
        fwrite(STDERR, "Décryptage impossible id={$row['id']}\n");
        $skipped++;
        continue;
    }
    $norm = User::normalizeFrenchPatientPhoneDigits($plain);
    $hash = $norm !== null ? User::patientPhoneDigitsHash($norm) : null;

    if ($dry) {
        echo "[dry-run] {$row['id']} → " . ($hash ?? 'NULL') . "\n";
        $n++;
        continue;
    }
    $upd = $db->prepare('UPDATE profiles SET phone_digits_hash = ?, updated_at = NOW() WHERE id = ?');
    $upd->execute([$hash, $row['id']]);
    $n++;
}

echo "Traité : {$n}, ignorés (erreur décryptage) : {$skipped}\n";
