<?php

declare(strict_types=1);

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$check = $pdo->query("SHOW TABLES LIKE 'patient_absences'");
if ($check && $check->rowCount() > 0) {
    echo "Migration 096 déjà appliquée (table patient_absences).\n";
    exit(0);
}

$sqlFile = __DIR__ . '/../../database/migrations/096_patient_absences.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Missing $sqlFile\n");
    exit(1);
}

$pdo->exec((string) file_get_contents($sqlFile));
echo "Migration 096 appliquée — patient_absences.\n";
