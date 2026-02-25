<?php
/**
 * Exécute la migration 035 (min_booking_lead_time_hours).
 *
 * Usage : php run-migration-035.php
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

echo "Migration 035 : min_booking_lead_time_hours\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/035_add_min_booking_lead_time_hours.sql');
$pdo->exec($sql);
echo "  [OK] Colonne min_booking_lead_time_hours ajoutée.\n";
