<?php

/**
 * Migration 074 — colonnes IAP sur patient_booking_drafts (Horaire VIP mobile).
 * Usage: php backend/scripts/apply-migration-074-patient-booking-draft-iap.php
 */

declare(strict_types=1);

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$sql = file_get_contents(__DIR__ . '/../../database/migrations/074_patient_booking_draft_iap.sql');
if ($sql === false) {
    fwrite(STDERR, "Fichier migration introuvable\n");
    exit(1);
}

foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    if ($stmt === '' || strpos($stmt, '--') === 0) {
        continue;
    }
    $db->exec($stmt);
}

echo "Migration 074 appliquée.\n";
