#!/usr/bin/env php
<?php
/**
 * Renseigne gender (male/female) pour les profils infirmiers à partir du prénom déchiffré.
 *
 * Usage:
 *   php backend/scripts/backfill-nurse-gender-from-firstname.php           # uniquement si gender vide
 *   php backend/scripts/backfill-nurse-gender-from-firstname.php --force  # réécrase même si déjà renseigné
 *   php backend/scripts/backfill-nurse-gender-from-firstname.php --dry-run
 */

$dry = in_array('--dry-run', $argv, true);
$force = in_array('--force', $argv, true);

$backendDir = dirname(__DIR__);
require_once $backendDir . '/config/database.php';
require_once $backendDir . '/lib/Crypto.php';
require_once $backendDir . '/lib/InferGenderFromFrenchFirstName.php';

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

$stmt = $db->query("SELECT id, first_name_encrypted, first_name_dek, gender_encrypted, gender_dek FROM profiles WHERE role = 'nurse'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$updated = 0;
$skipped = 0;
$ambiguous = 0;

foreach ($rows as $row) {
    if (!empty($row['gender_encrypted']) && !$force) {
        $skipped++;
        continue;
    }
    $first = '';
    if (!empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])) {
        try {
            $first = $crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek']);
        } catch (Throwable $e) {
            fwrite(STDERR, "Décryptage prénom impossible id={$row['id']}\n");
            $ambiguous++;
            continue;
        }
    }
    $inferred = InferGenderFromFrenchFirstName::infer($first);
    if ($inferred === null) {
        echo "Indécis id={$row['id']} prénom=" . json_encode($first, JSON_UNESCAPED_UNICODE) . "\n";
        $ambiguous++;
        continue;
    }
    if ($dry) {
        echo "[dry-run] id={$row['id']} → {$inferred} (" . trim($first) . ")\n";
        $updated++;
        continue;
    }
    $enc = $crypto->encryptField($inferred);
    $upd = $db->prepare('UPDATE profiles SET gender_encrypted = ?, gender_dek = ?, updated_at = NOW() WHERE id = ?');
    $upd->execute([$enc['encrypted'], $enc['dek'], $row['id']]);
    echo "OK id={$row['id']} → {$inferred}\n";
    $updated++;
}

echo "\nRésumé : mis à jour {$updated}, ignorés (déjà genre) {$skipped}, indécis/erreur {$ambiguous}\n";
