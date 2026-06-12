#!/usr/bin/env php
<?php

/**
 * Migration 069 : métadonnées ordonnances sur medical_documents.
 * Usage : php backend/scripts/run-migration-069-prescriptions.php
 */

$baseDir = dirname(__DIR__);
$migrationFile = $baseDir . '/../database/migrations/069_prescriptions_metadata.sql';

$envFile = $baseDir . '/../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            putenv(trim($name) . '=' . trim($value));
        }
    }
}

$config = require $baseDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

echo "=== Migration 069 : prescriptions metadata ===\n";

$sql = file_get_contents($migrationFile);
$statements = array_filter(array_map('trim', preg_split('/;\s*\n/', $sql)));

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    foreach ($statements as $statement) {
        if ($statement === '') {
            continue;
        }
        echo 'Executing: ' . substr(str_replace("\n", ' ', $statement), 0, 80) . "...\n";
        $pdo->exec($statement);
    }
    echo "Migration 069 terminée.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false || strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "Migration déjà appliquée.\n";
        exit(0);
    }
    fwrite(STDERR, 'Erreur : ' . $e->getMessage() . "\n");
    exit(1);
}
