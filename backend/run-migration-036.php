<?php
/**
 * Exécute la migration 036 (accept_rdv_saturday, accept_rdv_sunday).
 *
 * Usage : php run-migration-036.php
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

echo "Migration 036 : accept_rdv_saturday, accept_rdv_sunday\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/036_add_accept_rdv_saturday_sunday.sql');
$pdo->exec($sql);
echo "  [OK] Colonnes accept_rdv_saturday et accept_rdv_sunday ajoutées.\n";
