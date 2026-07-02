<?php
/**
 * Applique migration 094 (notif infirmier en route) si absente.
 * Usage: cd backend && php scripts/apply-migration-094.php
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

$stmt = $db->query("SHOW COLUMNS FROM nurse_tour_stops LIKE 'notif_nurse_en_route_sent_at'");
if ($stmt && $stmt->rowCount() > 0) {
    echo "Migration 094 déjà appliquée.\n";
    exit(0);
}

$sqlFile = __DIR__ . '/../../database/migrations/094_nurse_tour_en_route_notification.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Missing $sqlFile\n");
    exit(1);
}

$db->exec((string) file_get_contents($sqlFile));
echo "Migration 094 appliquée — notif_nurse_en_route_sent_at.\n";
