<?php
/**
 * Applique migration 093 (nurse_passage_series) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-093.php
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
    $check = $db->query("SHOW TABLES LIKE " . $db->quote($table));
    return $check && $check->rowCount() > 0;
}

function columnExists(PDO $db, string $table, string $column): bool
{
    $check = $db->query("SHOW COLUMNS FROM `$table` LIKE " . $db->quote($column));
    return $check && $check->rowCount() > 0;
}

function execIgnoreDuplicate(PDO $db, string $sql): void
{
    try {
        $db->exec($sql);
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        if (
            str_contains($msg, 'Duplicate column')
            || str_contains($msg, 'Duplicate key name')
            || str_contains($msg, 'already exists')
        ) {
            return;
        }
        throw $e;
    }
}

$applied = [];

if (!tableExists($db, 'nurse_passage_series')) {
    execIgnoreDuplicate($db, <<<'SQL'
CREATE TABLE IF NOT EXISTS nurse_passage_series (
    id CHAR(36) PRIMARY KEY,
    nurse_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    planning_type ENUM('single_day', 'interval', 'weekdays', 'custom_dates', 'manual') NOT NULL DEFAULT 'single_day',
    planning_config JSON NOT NULL,
    time_slot ENUM('morning', 'noon', 'afternoon', 'evening', 'night', 'custom') NOT NULL DEFAULT 'morning',
    custom_time TIME NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    at_home TINYINT(1) NOT NULL DEFAULT 1,
    nursing_items JSON NOT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_passage_series_nurse (nurse_id),
    INDEX idx_passage_series_patient (patient_id),
    INDEX idx_passage_series_nurse_patient (nurse_id, patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    $applied[] = 'nurse_passage_series';
}

if (!columnExists($db, 'appointments', 'passage_series_id')) {
    execIgnoreDuplicate($db, "ALTER TABLE appointments ADD COLUMN passage_series_id CHAR(36) NULL AFTER creation_batch_id");
    $applied[] = 'appointments.passage_series_id';
}

if (!columnExists($db, 'appointments', 'passage_source')) {
    execIgnoreDuplicate($db, "ALTER TABLE appointments ADD COLUMN passage_source ENUM('nurse_passage', 'booking', 'staff_wizard') NULL AFTER passage_series_id");
    $applied[] = 'appointments.passage_source';
}

execIgnoreDuplicate($db, 'ALTER TABLE appointments ADD INDEX idx_appointments_passage_series (passage_series_id)');

if ($applied === []) {
    echo "Migration 093 déjà complète.\n";
} else {
    echo 'Migration 093 appliquée — ' . implode(', ', $applied) . ".\n";
}
