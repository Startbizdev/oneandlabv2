<?php
/**
 * Applique migration 098 (tournée préleveur) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-098.php
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

if (!tableExists($db, 'preleveur_tour_plans')) {
    $db->exec(<<<'SQL'
CREATE TABLE preleveur_tour_plans (
    id CHAR(36) PRIMARY KEY,
    preleveur_id CHAR(36) NOT NULL,
    tour_date DATE NOT NULL,
    appointment_order_json JSON NULL,
    manual_order_locked TINYINT(1) NOT NULL DEFAULT 0,
    nav_app_pref ENUM('waze', 'google_maps', 'apple_maps', 'system') NOT NULL DEFAULT 'waze',
    sort_mode ENUM('smart', 'schedule', 'nearest', 'manual') NOT NULL DEFAULT 'smart',
    optimized_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_preleveur_tour_date (preleveur_id, tour_date),
    INDEX idx_preleveur_tour_preleveur (preleveur_id),
    INDEX idx_preleveur_tour_date (tour_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    echo "OK: table preleveur_tour_plans créée.\n";
} else {
    echo "SKIP: preleveur_tour_plans existe déjà.\n";
}

if (!tableExists($db, 'preleveur_tour_stops')) {
    $db->exec(<<<'SQL'
CREATE TABLE preleveur_tour_stops (
    id CHAR(36) PRIMARY KEY,
    tour_plan_id CHAR(36) NOT NULL,
    appointment_id CHAR(36) NOT NULL,
    visit_status ENUM('todo', 'en_route', 'on_site', 'done', 'skipped') NOT NULL DEFAULT 'todo',
    visited_at DATETIME NULL,
    skip_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_preleveur_plan_appointment (tour_plan_id, appointment_id),
    INDEX idx_preleveur_tour_stops_plan (tour_plan_id),
    INDEX idx_preleveur_tour_stops_appointment (appointment_id),
    CONSTRAINT fk_preleveur_tour_stops_plan FOREIGN KEY (tour_plan_id) REFERENCES preleveur_tour_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_preleveur_tour_stops_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    echo "OK: table preleveur_tour_stops créée.\n";
} else {
    echo "SKIP: preleveur_tour_stops existe déjà.\n";
}

echo "Migration 098 terminée.\n";
