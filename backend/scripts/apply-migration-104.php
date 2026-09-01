<?php
/**
 * Applique migration 104 (zones polygone coverage_zones) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-104.php
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

$col = $db->query("SHOW COLUMNS FROM coverage_zones LIKE 'zone_type'")->fetch(PDO::FETCH_ASSOC);
if (!$col) {
    fwrite(STDERR, "ERR: colonne zone_type absente (appliquer 103 d'abord).\n");
    exit(1);
}

$type = (string) ($col['Type'] ?? '');
if (stripos($type, 'polygon') === false) {
    $db->exec(
        "ALTER TABLE coverage_zones MODIFY COLUMN zone_type ENUM('circle','square','polygon') NOT NULL DEFAULT 'square'"
    );
}

$col = $db->query("SHOW COLUMNS FROM coverage_zones LIKE 'zone_type'")->fetch(PDO::FETCH_ASSOC);
$type = (string) ($col['Type'] ?? '');
if (stripos($type, 'polygon') === false) {
    fwrite(STDERR, "ERR: ENUM zone_type sans polygon après migration 104.\n");
    exit(1);
}

$total = (int) $db->query('SELECT COUNT(*) FROM coverage_zones')->fetchColumn();
$poly = (int) $db->query("SELECT COUNT(*) FROM coverage_zones WHERE zone_type = 'polygon'")->fetchColumn();
echo "OK: migration 104 — $total zones, $poly polygones, ENUM=$type\n";
echo "Migration 104 terminée.\n";
