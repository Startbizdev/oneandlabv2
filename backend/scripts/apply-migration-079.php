<?php
/**
 * Applique migration 079 (prescription_generation_enabled sur profiles) si absente.
 * Usage: cd backend && php scripts/apply-migration-079.php
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

$stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'prescription_generation_enabled'");
if ($stmt && $stmt->rowCount() > 0) {
    echo "Migration 079 déjà appliquée.\n";
    exit(0);
}

$external = __DIR__ . '/../../database/migrations/079_prescription_generation_enabled.sql';
if (!is_readable($external)) {
    fwrite(STDERR, "Fichier migration introuvable: {$external}\n");
    exit(1);
}

$sql = (string) file_get_contents($external);
$db->exec($sql);
echo "Migration 079 appliquée — prescription_generation_enabled sur profiles.\n";
