<?php

/**
 * Corrige les profils dont l'adresse déchiffrée ressemble à un email (contient @)
 * Met address_encrypted et address_dek à NULL pour ces profils
 * Usage: php fix-address-email-mixup.php [--dry-run]
 *
 * Sur le serveur: cd /var/www/oneandlab/backend && php scripts/migration/fix-address-email-mixup.php
 */

$dryRun = in_array('--dry-run', $argv ?? []);

$baseDir = dirname(__DIR__, 2);
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/lib/Crypto.php';

// Charger .env
$envPath = $baseDir . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

$config = require $baseDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'],
    $config['port'],
    $config['database']
);
$db = new PDO($dsn, $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$crypto = new Crypto();

$stmt = $db->query("
    SELECT id, role, email_hash, address_encrypted, address_dek
    FROM profiles
    WHERE address_encrypted IS NOT NULL AND address_encrypted != ''
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Profils avec adresse: " . count($rows) . "\n";

$toFix = [];
foreach ($rows as $row) {
    try {
        $decrypted = $crypto->decryptField($row['address_encrypted'], $row['address_dek']);
        $decoded = json_decode($decrypted, true);
        $label = '';
        if (is_array($decoded) && !empty($decoded['label'])) {
            $label = trim((string) $decoded['label']);
        } elseif ($decoded === null && is_string($decrypted) && trim($decrypted) !== '') {
            $label = trim($decrypted);
        }
        if ($label !== '' && strpos($label, '@') !== false) {
            $toFix[] = [
                'id' => $row['id'],
                'role' => $row['role'],
                'email_hash' => $row['email_hash'],
                'address_decrypted' => $label,
            ];
        }
    } catch (Exception $e) {
        echo "  Erreur déchiffrement profile {$row['id']}: " . $e->getMessage() . "\n";
    }
}

echo "Profils à corriger (adresse = email): " . count($toFix) . "\n\n";

if (empty($toFix)) {
    echo "Rien à faire.\n";
    exit(0);
}

foreach ($toFix as $p) {
    echo "  - {$p['id']} ({$p['role']}) : address = \"{$p['address_decrypted']}\" → NULL\n";
}

if (!$dryRun && !empty($toFix)) {
    $update = $db->prepare("UPDATE profiles SET address_encrypted = NULL, address_dek = NULL WHERE id = ?");
    foreach ($toFix as $p) {
        $update->execute([$p['id']]);
    }
    echo "\n" . count($toFix) . " profil(s) corrigé(s).\n";
} elseif ($dryRun) {
    echo "\n[DRY-RUN] Aucune modification. Relancez sans --dry-run pour appliquer.\n";
}
