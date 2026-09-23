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

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/111_pharmacy_favorites.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

$sql = file_get_contents($sqlFile);
if ($sql === false) {
    fwrite(STDERR, "Lecture migration impossible: $sqlFile\n");
    exit(1);
}

$pdo->exec($sql);
echo "Migration 111 (pharmacy_favorites) terminée.\n";
