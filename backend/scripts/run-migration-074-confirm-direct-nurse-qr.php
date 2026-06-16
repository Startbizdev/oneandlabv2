#!/usr/bin/env php
<?php

/**
 * Migration 074 : confirmer les RDV soins QR / fiche publique (pending + infirmier assigné).
 *
 * Usage :
 *   cd backend && php scripts/run-migration-074-confirm-direct-nurse-qr.php
 * Sur le serveur :
 *   cd /var/www/oneandlab/backend && php scripts/run-migration-074-confirm-direct-nurse-qr.php
 */

$backendDir = dirname(__DIR__);

$sqlPath = $backendDir . '/../database/migrations/074_confirm_direct_nurse_qr_bookings.sql';
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
    $affected = $pdo->exec($sql);
} catch (PDOException $e) {
    fwrite(STDERR, 'Exécution migration: ' . $e->getMessage() . "\n");
    exit(1);
}

echo '074_confirm_direct_nurse_qr_bookings: OK';
if ($affected !== false) {
    echo " ({$affected} ligne(s) mise(s) à jour)";
}
echo ".\n";
