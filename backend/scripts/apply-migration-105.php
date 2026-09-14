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
try {
    $pdo->exec("SET time_zone = 'Europe/Paris'");
} catch (Throwable) {
    // MySQL sans tables fuseaux : backfill PHP en heure Paris, comparaisons via PendingOfferExpiry.
}

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/105_pending_offer_expires_at.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

foreach (array_filter(array_map('trim', explode(';', file_get_contents($sqlFile)))) as $stmt) {
    if ($stmt === '') {
        continue;
    }
    try {
        $pdo->exec($stmt);
        echo "OK: " . substr(str_replace("\n", ' ', $stmt), 0, 80) . "...\n";
    } catch (PDOException $e) {
        echo 'SKIP/ERR: ' . $e->getMessage() . "\n";
    }
}

$sel = $pdo->query("
    SELECT id, type, status, assigned_nurse_id, assigned_lab_id, created_at, pending_offer_expires_at
    FROM appointments
    WHERE status = 'pending'
      AND (
        (type = 'nursing' AND (assigned_nurse_id IS NULL OR TRIM(assigned_nurse_id) = ''))
        OR
        (type = 'blood_test' AND (assigned_lab_id IS NULL OR TRIM(assigned_lab_id) = ''))
      )
");
$upd = $pdo->prepare('UPDATE appointments SET pending_offer_expires_at = ? WHERE id = ?');
$backfilled = 0;
while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
    $expires = PendingOfferExpiry::computeExpiresAtForRow($row);
    if ($expires === null) {
        continue;
    }
    $upd->execute([PendingOfferExpiry::formatSqlDateTime($expires), $row['id']]);
    $backfilled++;
}

echo "Migration 105 terminée. Backfill pending: {$backfilled} RDV.\n";
