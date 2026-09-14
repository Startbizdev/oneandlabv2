<?php

require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

$sqlFile = dirname(__DIR__, 2) . '/database/migrations/106_appointment_conversation.sql';
if (!is_readable($sqlFile)) {
    fwrite(STDERR, "Fichier migration introuvable: $sqlFile\n");
    exit(1);
}

foreach (array_filter(array_map('trim', explode(';', file_get_contents($sqlFile)))) as $stmt) {
    if ($stmt === '') {
        continue;
    }
    try {
        $pdo->exec($stmt);
        echo "OK: " . substr(str_replace("\n", ' ', $stmt), 0, 80) . "...\n";
    } catch (PDOException $e) {
        echo 'SKIP/ERR: ' . $e->getMessage() . "\n";
    }
}

echo "Migration 106 terminée.\n";
