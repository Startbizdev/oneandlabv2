<?php
/**
 * Applique migration 101 (lab_brands + préférence patient) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-101.php
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

function tableExists(PDO $db, string $table): bool
{
    $check = $db->query('SHOW TABLES LIKE ' . $db->quote($table));
    return $check && $check->rowCount() > 0;
}

function columnExists(PDO $db, string $table, string $column): bool
{
    $check = $db->query("SHOW COLUMNS FROM `$table` LIKE " . $db->quote($column));
    return $check && $check->rowCount() > 0;
}

function indexExists(PDO $db, string $table, string $index): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1'
    );
    $stmt->execute([$table, $index]);
    return (bool) $stmt->fetchColumn();
}

function execIgnoreDuplicate(PDO $db, string $sql): void
{
    try {
        $db->exec($sql);
    } catch (PDOException $e) {
        if (stripos($e->getMessage(), 'Duplicate') === false && stripos($e->getMessage(), 'already exists') === false) {
            throw $e;
        }
    }
}

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/101_lab_brands.sql';
if (!is_file($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

if (!tableExists($db, 'lab_brands')) {
    $db->exec("
CREATE TABLE lab_brands (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    logo_url VARCHAR(512) NULL,
    website_url VARCHAR(512) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lab_brands_slug (slug),
    INDEX idx_lab_brands_active_sort (is_active, sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
    echo "OK: table lab_brands créée.\n";
} else {
    echo "SKIP: lab_brands existe.\n";
}

if (!columnExists($db, 'appointments', 'lab_preference_mode')) {
    execIgnoreDuplicate($db, "ALTER TABLE appointments ADD COLUMN lab_preference_mode ENUM('platform_match', 'brand_choice') NULL DEFAULT NULL AFTER dispatch_mode");
    echo "OK: lab_preference_mode ajoutée.\n";
} else {
    echo "SKIP: lab_preference_mode existe.\n";
}

if (!columnExists($db, 'appointments', 'preferred_lab_brand_id')) {
    execIgnoreDuplicate($db, 'ALTER TABLE appointments ADD COLUMN preferred_lab_brand_id CHAR(36) NULL DEFAULT NULL AFTER lab_preference_mode');
    echo "OK: preferred_lab_brand_id ajoutée.\n";
} else {
    echo "SKIP: preferred_lab_brand_id existe.\n";
}

if (!indexExists($db, 'appointments', 'idx_appointments_lab_preference')) {
    execIgnoreDuplicate($db, 'CREATE INDEX idx_appointments_lab_preference ON appointments (lab_preference_mode, preferred_lab_brand_id, status)');
    echo "OK: idx_appointments_lab_preference créé.\n";
}

try {
    $db->exec("ALTER TABLE appointments MODIFY COLUMN dispatch_mode ENUM('zone','external_invite','direct_assign','manual','patient_brand_choice') NULL DEFAULT NULL");
    echo "OK: dispatch_mode ENUM étendu.\n";
} catch (PDOException $e) {
    echo "SKIP/MODIFY dispatch_mode: " . $e->getMessage() . "\n";
}

try {
    $db->exec('ALTER TABLE appointments ADD CONSTRAINT fk_appointments_preferred_lab_brand FOREIGN KEY (preferred_lab_brand_id) REFERENCES lab_brands(id) ON DELETE SET NULL');
    echo "OK: FK preferred_lab_brand.\n";
} catch (PDOException $e) {
    echo "SKIP FK: " . $e->getMessage() . "\n";
}

$seed = $db->query('SELECT COUNT(*) FROM lab_brands')->fetchColumn();
if ((int) $seed === 0) {
    $sql = file_get_contents($sqlFile);
    if (preg_match('/INSERT INTO lab_brands\b.*?;\s*$/s', $sql, $m)) {
        $db->exec($m[0]);
        echo "OK: seed marques (INSERT uniquement).\n";
    } else {
        fwrite(STDERR, "WARN: bloc INSERT introuvable dans $sqlFile\n");
        exit(1);
    }
} else {
    echo "SKIP: lab_brands déjà peuplé ($seed lignes).\n";
}

echo "Migration 101 terminée.\n";
