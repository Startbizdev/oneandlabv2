<?php
/**
 * Applique la migration 097 (snooze modal offres RDV).
 * Usage : php backend/scripts/apply-migration-097.php
 */
require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$sql = file_get_contents(__DIR__ . '/../../database/migrations/097_appointment_offer_modal_snooze.sql');
if ($sql === false) {
    fwrite(STDERR, "Fichier migration introuvable\n");
    exit(1);
}

foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
    if ($statement === '' || str_starts_with($statement, '--')) {
        continue;
    }
    try {
        $db->exec($statement);
        echo "OK: " . substr(str_replace("\n", ' ', $statement), 0, 80) . "...\n";
    } catch (PDOException $e) {
        echo "SKIP/ERR: " . $e->getMessage() . "\n";
    }
}

echo "Migration 097 terminée.\n";
