<?php

/**
 * Migration 105 : pending_offer_expires_at + backfill pending non assignés.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/PendingOfferExpiry.php';

$config = require __DIR__ . '/../config/database.php';
$pdoOptions = array_merge($config['options'] ?? [], [
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
]);
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $pdoOptions
);

$hasColumn = (int) $pdo->query("
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'appointments'
      AND column_name = 'pending_offer_expires_at'
")->fetchColumn();

if ($hasColumn === 0) {
    $pdo->exec(
        'ALTER TABLE appointments ADD COLUMN pending_offer_expires_at DATETIME NULL DEFAULT NULL AFTER updated_at'
    );
    echo "OK: colonne pending_offer_expires_at ajoutée.\n";
} else {
    echo "SKIP: colonne pending_offer_expires_at existe déjà.\n";
}

$hasIndex = (int) $pdo->query("
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'appointments'
      AND index_name = 'idx_appointments_pending_offer_expires_at'
")->fetchColumn();

if ($hasIndex === 0) {
    $pdo->exec(
        'CREATE INDEX idx_appointments_pending_offer_expires_at ON appointments (status, pending_offer_expires_at)'
    );
    echo "OK: index idx_appointments_pending_offer_expires_at créé.\n";
} else {
    echo "SKIP: index idx_appointments_pending_offer_expires_at existe déjà.\n";
}

$rows = $pdo->query("
    SELECT id, type, status, assigned_nurse_id, assigned_lab_id, created_at, pending_offer_expires_at
    FROM appointments
    WHERE status = 'pending'
      AND (
        (type = 'nursing' AND (assigned_nurse_id IS NULL OR TRIM(assigned_nurse_id) = ''))
        OR
        (type = 'blood_test' AND (assigned_lab_id IS NULL OR TRIM(assigned_lab_id) = ''))
      )
")->fetchAll(PDO::FETCH_ASSOC);

$upd = $pdo->prepare('UPDATE appointments SET pending_offer_expires_at = ? WHERE id = ?');
$backfilled = 0;
foreach ($rows as $row) {
    if (!empty($row['pending_offer_expires_at'])) {
        continue;
    }
    $expires = PendingOfferExpiry::computeExpiresAtForRow($row);
    if ($expires === null) {
        continue;
    }
    $upd->execute([PendingOfferExpiry::formatSqlDateTime($expires), $row['id']]);
    $backfilled++;
}

echo "Migration 105 terminée. Backfill pending: {$backfilled} RDV.\n";
