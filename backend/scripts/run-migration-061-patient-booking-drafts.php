#!/usr/bin/env php
<?php

/**
 * Migration 061 : table patient_booking_drafts (brouillon + Stripe urgence patient).
 *
 * Charge la config depuis backend/config/database.php (lit .env à la racine du projet).
 * Idempotent : CREATE TABLE IF NOT EXISTS.
 *
 * Usage (sur la machine où le projet est déployé) :
 *   cd /var/www/oneandlab/backend && php scripts/run-migration-061-patient-booking-drafts.php
 */

$backendDir = dirname(__DIR__);

$sqlPath = $backendDir . '/../database/migrations/061_patient_booking_drafts.sql';
if (!is_file($sqlPath)) {
    fwrite(STDERR, "Fichier SQL introuvable: $sqlPath\n");
    exit(1);
}

$sql = file_get_contents($sqlPath);
if ($sql === false || trim($sql) === '') {
    fwrite(STDERR, "Lecture SQL impossible.\n");
    exit(1);
}

$config = require $backendDir . '/config/database.php';

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
} catch (PDOException $e) {
    fwrite(STDERR, 'Connexion DB: ' . $e->getMessage() . "\n");
    exit(1);
}

try {
    $pdo->exec($sql);
} catch (PDOException $e) {
    fwrite(STDERR, 'Exécution migration: ' . $e->getMessage() . "\n");
    exit(1);
}

echo "061_patient_booking_drafts: OK.\n";
