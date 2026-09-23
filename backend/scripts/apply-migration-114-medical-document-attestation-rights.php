<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
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
$sqlFile = dirname(__DIR__, 2) . '/database/migrations/114_medical_document_attestation_rights.sql';
$sql = is_readable($sqlFile) ? file_get_contents($sqlFile) : false;
if ($sql === false) {
    fwrite(STDERR, "Migration 114 introuvable ou illisible.\n");
    exit(1);
}
$pdo->exec($sql);
echo "Migration 114 (attestation droits / AME) terminée.\n";
