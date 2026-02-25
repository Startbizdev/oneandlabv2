<?php
/**
 * Exécute la migration 031 (is_accepting_appointments).
 *
 * Usage : php run-migration-031.php
 */

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

echo "Migration 031 : is_accepting_appointments\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/031_add_is_accepting_appointments.sql');
$pdo->exec($sql);
echo "  [OK] Colonne is_accepting_appointments ajoutée.\n";
