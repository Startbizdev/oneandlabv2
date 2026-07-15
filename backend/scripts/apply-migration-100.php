<?php
/**
 * Applique migration 100 (appointment_dispatch_events + dispatch_mode) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-100.php
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

if (!tableExists($db, 'appointment_dispatch_events')) {
    execIgnoreDuplicate($db, <<<'SQL'
CREATE TABLE IF NOT EXISTS appointment_dispatch_events (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    event_type ENUM(
        'created',
        'zone_dispatch',
        'redispatch',
        'external_nurse_invite',
        'direct_assign',
        'offer_declined',
        'offer_accepted',
        'offer_accepted_via_share_token',
        'nurse_share_release',
        'nurse_share_link_created',
        'reassign',
        'nurse_share_redispatch_zone'
    ) NOT NULL,
    actor_id CHAR(36) NULL,
    actor_role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NULL,
    target_profile_id CHAR(36) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dispatch_events_appointment (appointment_id, created_at),
    INDEX idx_dispatch_events_type (event_type, created_at),
    INDEX idx_dispatch_events_target (target_profile_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (target_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);
    echo "OK: table appointment_dispatch_events créée.\n";
} else {
    echo "SKIP: appointment_dispatch_events existe déjà.\n";
}

if (!columnExists($db, 'appointments', 'dispatch_mode')) {
    execIgnoreDuplicate($db, "ALTER TABLE appointments ADD COLUMN dispatch_mode ENUM('zone', 'external_invite', 'direct_assign', 'manual') NULL DEFAULT NULL AFTER assigned_pro_id");
    echo "OK: colonne dispatch_mode ajoutée.\n";
} else {
    echo "SKIP: dispatch_mode existe déjà.\n";
}

if (!indexExists($db, 'appointments', 'idx_appointments_dispatch_mode')) {
    execIgnoreDuplicate($db, 'CREATE INDEX idx_appointments_dispatch_mode ON appointments (dispatch_mode, status, created_at)');
    echo "OK: idx_appointments_dispatch_mode créé.\n";
} else {
    echo "SKIP: idx_appointments_dispatch_mode existe déjà.\n";
}

echo "Migration 100 terminée.\n";
