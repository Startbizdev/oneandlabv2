<?php

declare(strict_types=1);

require_once __DIR__ . '/migrations/patient-record-migrations.php';
require_once __DIR__ . '/../lib/RelativeProfileBackfill.php';

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
try {
    echo applyMigration126PatientRelativesProfile($pdo, dirname(__DIR__, 2) . '/database/migrations') . "\n";
    echo 'Backfill dossiers proches : ' . json_encode(RelativeProfileBackfill::run($pdo, true)) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
