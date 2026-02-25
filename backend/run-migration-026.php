<?php
/**
 * Exécute la migration 026 (table subscriptions pour Stripe).
 *
 * Usage : php run-migration-026.php
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

echo "Migration 026 : table subscriptions\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/026_create_subscriptions.sql');
$pdo->exec($sql);
echo "  [OK] Table subscriptions créée.\n";
