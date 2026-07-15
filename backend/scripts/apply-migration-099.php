<?php
/**
 * Applique migration 099 (index perf liste RDV admin) — idempotent.
 * Usage: cd backend && php scripts/apply-migration-099.php
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

function indexExists(PDO $db, string $table, string $index): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1'
    );
    $stmt->execute([$table, $index]);

    return (bool) $stmt->fetchColumn();
}

if (!indexExists($db, 'appointments', 'idx_appointments_created_at')) {
    $db->exec('CREATE INDEX idx_appointments_created_at ON appointments (created_at)');
    echo "OK: idx_appointments_created_at créé.\n";
} else {
    echo "SKIP: idx_appointments_created_at existe déjà.\n";
}

if (!indexExists($db, 'appointments', 'idx_appointments_type_batch_created')) {
    $db->exec('CREATE INDEX idx_appointments_type_batch_created ON appointments (type, creation_batch_id, created_at)');
    echo "OK: idx_appointments_type_batch_created créé.\n";
} else {
    echo "SKIP: idx_appointments_type_batch_created existe déjà.\n";
}

echo "Migration 099 terminée.\n";
