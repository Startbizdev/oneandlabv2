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
$file = dirname(__DIR__, 2) . '/database/migrations/115_patient_professional_qr_origin.sql';
$sql = is_readable($file) ? file_get_contents($file) : false;
if ($sql === false) {
    fwrite(STDERR, "Migration 115 introuvable ou illisible.\n");
    exit(1);
}
$pdo->exec($sql);
echo "Migration 115 (origine QR patient) terminée.\n";
