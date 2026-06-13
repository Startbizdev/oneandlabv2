<?php
/**
 * Applique migration 071 (signature ordonnance) si absente.
 * Usage: cd backend && php scripts/apply-migration-071.php
 */
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_signature_encrypted'");
if ($stmt && $stmt->rowCount() > 0) {
    echo "Migration 071 déjà appliquée.\n";
    exit(0);
}

$sql = <<<'SQL'
ALTER TABLE profiles
    ADD COLUMN prescription_signature_encrypted MEDIUMBLOB NULL COMMENT 'PNG signature ordonnance (chiffré)' AFTER adeli_dek,
    ADD COLUMN prescription_signature_dek VARBINARY(512) NULL AFTER prescription_signature_encrypted;
SQL;

$external = __DIR__ . '/../../database/migrations/071_prescription_signature.sql';
if (is_readable($external)) {
    $sql = (string) file_get_contents($external);
}

$db->exec($sql);
echo "Migration 071 appliquée — signature ordonnance sur profiles.\n";
