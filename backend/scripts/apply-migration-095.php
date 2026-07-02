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

$check = $pdo->query("SHOW TABLES LIKE 'patient_clinical_vitals'");
if ($check && $check->rowCount() > 0) {
    echo "Migration 095 déjà appliquée (table patient_clinical_vitals).\n";
    exit(0);
}

$sqlFile = __DIR__ . '/../../database/migrations/095_patient_clinical_vitals.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Missing $sqlFile\n");
    exit(1);
}

$pdo->exec((string) file_get_contents($sqlFile));
echo "Migration 095 appliquée — patient_clinical_vitals.\n";
