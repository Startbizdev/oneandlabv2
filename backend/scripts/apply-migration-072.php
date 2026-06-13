<?php
/**
 * Applique migration 072 (NIR patient) si absente.
 * Usage: cd backend && php scripts/apply-migration-072.php
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

$stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'nir_encrypted'");
if ($stmt && $stmt->rowCount() > 0) {
    echo "Migration 072 déjà appliquée.\n";
    exit(0);
}

$sql = <<<'SQL'
ALTER TABLE profiles
    ADD COLUMN nir_encrypted MEDIUMBLOB NULL COMMENT 'NIR patient (chiffré)' AFTER birth_date_dek,
    ADD COLUMN nir_dek VARBINARY(512) NULL AFTER nir_encrypted;
SQL;

$external = __DIR__ . '/../../database/migrations/072_patient_nir.sql';
if (is_readable($external)) {
    $sql = (string) file_get_contents($external);
}

$db->exec($sql);
echo "Migration 072 appliquée — NIR patient sur profiles.\n";
