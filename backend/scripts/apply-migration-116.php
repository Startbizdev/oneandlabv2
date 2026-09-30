<?php

declare(strict_types=1);

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
$file = dirname(__DIR__, 2) . '/database/migrations/116_lab_brand_labs.sql';
$sql = is_readable($file) ? file_get_contents($file) : false;
if ($sql === false) {
    fwrite(STDERR, "Migration 116 introuvable ou illisible.\n");
    exit(1);
}
$pdo->exec($sql);
echo "Migration 116 (comptes labo par marque) terminée.\n";
