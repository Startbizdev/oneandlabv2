<?php
/**
 * Applique migration 103 (zones carrées coverage_zones) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-103.php
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

function columnExists(PDO $db, string $table, string $column): bool
{
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    return (int) $stmt->fetchColumn() > 0;
}

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/103_coverage_square_zones.sql';
if (!is_file($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

$sql = file_get_contents($sqlFile);
try {
    $db->exec($sql);
} catch (PDOException $e) {
    fwrite(STDERR, 'ERR migration 103: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

if (!columnExists($db, 'coverage_zones', 'zone_type')) {
    fwrite(STDERR, "ERR: colonne zone_type absente après migration 103.\n");
    exit(1);
}
if (!columnExists($db, 'coverage_zones', 'bounds_json')) {
    fwrite(STDERR, "ERR: colonne bounds_json absente après migration 103.\n");
    exit(1);
}

$total = (int) $db->query('SELECT COUNT(*) FROM coverage_zones')->fetchColumn();
$square = (int) $db->query("SELECT COUNT(*) FROM coverage_zones WHERE zone_type = 'square'")->fetchColumn();
$withBounds = (int) $db->query(
    "SELECT COUNT(*) FROM coverage_zones WHERE bounds_json IS NOT NULL AND bounds_json != 'null'"
)->fetchColumn();

echo "OK: migration 103 — $total zones, $square carrées, $withBounds avec bounds_json.\n";

$sample = $db->query(
    'SELECT id, radius_km, zone_type, bounds_json IS NOT NULL AS has_bounds FROM coverage_zones LIMIT 3'
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($sample as $row) {
    echo '  - ' . $row['id'] . ' demi-côté=' . $row['radius_km'] . 'km type=' . $row['zone_type']
        . ' bounds=' . ($row['has_bounds'] ? 'oui' : 'non') . PHP_EOL;
}

echo "Migration 103 terminée.\n";
