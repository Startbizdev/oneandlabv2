<?php

declare(strict_types=1);

/**
 * Restaure le RPPS / Adeli des soignants (pro, infirmier) qui l'ont perdu en enregistrant leur profil depuis
 * l'app (ancienne version : RPPS vide envoyé puis effacé). Source : leur demande d'inscription acceptée.
 *
 * Ne touche qu'aux profils sans RPPS ni Adeli, ne remplace jamais un numéro existant, n'affiche aucun numéro.
 * Usage : php scripts/restore-professional-id-from-registration.php            (simulation)
 *         php scripts/restore-professional-id-from-registration.php --apply    (écriture)
 */

require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/ProfessionalId.php';

$apply = in_array('--apply', $argv, true);
$config = require __DIR__ . '/../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$crypto = new Crypto();

$hasAdeli = (bool) $db->query("SHOW COLUMNS FROM profiles LIKE 'adeli_encrypted'")->fetch();
$missing = "p.rpps_encrypted IS NULL" . ($hasAdeli ? ' AND p.adeli_encrypted IS NULL' : '');

$profiles = $db->query(
    "SELECT p.id, p.role, p.email_hash FROM profiles p
     WHERE p.role IN ('pro', 'nurse') AND p.email_hash IS NOT NULL AND $missing"
)->fetchAll(PDO::FETCH_ASSOC);

$request = $db->prepare(
    "SELECT rpps_encrypted, rpps_dek, adeli_encrypted, adeli_dek FROM registration_requests
     WHERE email_hash = ? AND role = ? AND status = 'accepted'
       AND (rpps_encrypted IS NOT NULL OR adeli_encrypted IS NOT NULL)
     ORDER BY created_at DESC LIMIT 1"
);

$decrypt = static function (?string $enc, ?string $dek) use ($crypto): string {
    if ($enc === null || $enc === '' || $dek === null || $dek === '') {
        return '';
    }
    try {
        return ProfessionalId::normalize($crypto->decryptField($enc, $dek));
    } catch (Throwable) {
        return '';
    }
};

$stats = ['sans_numero' => count($profiles), 'restaurables' => 0, 'restaures' => 0, 'sans_source' => 0, 'source_invalide' => 0];
foreach ($profiles as $profile) {
    $request->execute([$profile['email_hash'], $profile['role']]);
    $row = $request->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        $stats['sans_source']++;
        continue;
    }
    $raw = $decrypt($row['rpps_encrypted'], $row['rpps_dek']) ?: $decrypt($row['adeli_encrypted'], $row['adeli_dek']);
    $split = ProfessionalId::split($raw);
    if ($split['rpps'] === null && $split['adeli'] === null) {
        $stats['source_invalide']++;
        continue;
    }
    $stats['restaurables']++;
    echo ($apply ? 'Restauré' : 'À restaurer') . ' : profil ' . $profile['id'] . ' (' . $profile['role'] . ', ' . ($split['rpps'] !== null ? 'RPPS' : 'Adeli') . ")\n";
    if (!$apply) {
        continue;
    }
    if ($split['rpps'] !== null) {
        $enc = $crypto->encryptField($split['rpps']);
        $sql = "UPDATE profiles p SET rpps_encrypted = ?, rpps_dek = ? WHERE p.id = ? AND $missing";
    } else {
        $enc = $crypto->encryptField($split['adeli']);
        $sql = "UPDATE profiles p SET adeli_encrypted = ?, adeli_dek = ? WHERE p.id = ? AND $missing";
    }
    $update = $db->prepare($sql);
    $update->execute([$enc['encrypted'], $enc['dek'], $profile['id']]);
    $stats['restaures'] += $update->rowCount();
}

echo ($apply ? '== Écriture' : '== Simulation (ajouter --apply pour écrire)') . "\n";
foreach ($stats as $key => $value) {
    echo str_pad($key, 16) . ": $value\n";
}
