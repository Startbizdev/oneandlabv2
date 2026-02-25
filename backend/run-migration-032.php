<?php
/**
 * Exécute la migration 032 (appointment_share_tokens).
 *
 * Usage : php run-migration-032.php
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

echo "Migration 032 : appointment_share_tokens\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/032_appointment_share_tokens.sql');
$pdo->exec($sql);
echo "  [OK] Table appointment_share_tokens créée.\n";
