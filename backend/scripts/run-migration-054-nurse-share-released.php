<?php
/**
 * Migration 054 : nurse_share_released_at + index (idempotent).
 * Usage : php backend/scripts/run-migration-054-nurse-share-released.php
 */
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    ),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    $pdo->exec(
        "ALTER TABLE appointments ADD COLUMN nurse_share_released_at DATETIME NULL DEFAULT NULL "
        . "COMMENT 'Repend partage WhatsApp' AFTER updated_at"
    );
    fwrite(STDOUT, "OK: colonne nurse_share_released_at ajoutee\n");
} catch (PDOException $e) {
    $m = $e->getMessage();
    if (stripos($m, 'Duplicate column') !== false || stripos($m, 'already exists') !== false) {
        fwrite(STDOUT, "SKIP: colonne deja presente\n");
    } else {
        throw $e;
    }
}

try {
    $pdo->exec(
        'CREATE INDEX idx_appointments_nurse_share_released ON appointments (type, status, nurse_share_released_at)'
    );
    fwrite(STDOUT, "OK: index idx_appointments_nurse_share_released\n");
} catch (PDOException $e) {
    $m = $e->getMessage();
    if (stripos($m, 'Duplicate') !== false || stripos($m, 'already exists') !== false) {
        fwrite(STDOUT, "SKIP: index deja present\n");
    } else {
        throw $e;
    }
}
