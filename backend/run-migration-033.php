<?php
/**
 * Exécute la migration 033 (champs d'annulation RDV : canceled_by, canceled_at, etc.).
 *
 * Usage : php run-migration-033.php
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

echo "Migration 033 : appointment cancellation fields (canceled_by, canceled_at, ...)\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/033_appointment_cancellation_fields.sql');
$pdo->exec($sql);
echo "  [OK] Colonnes d'annulation ajoutées à la table appointments.\n";
