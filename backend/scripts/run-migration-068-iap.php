#!/usr/bin/env php
<?php

/**
 * Migration 068 : colonnes IAP sur subscriptions.
 * Usage (depuis backend/) : php scripts/run-migration-068-iap.php
 */

$baseDir = dirname(__DIR__);
$migrationFile = $baseDir . '/../database/migrations/068_subscriptions_iap.sql';

$envFile = $baseDir . '/../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
            putenv("$key=$val");
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

echo "=== Migration 068 : IAP subscriptions ===\n";

if (!file_exists($migrationFile)) {
    fwrite(STDERR, "Fichier introuvable : $migrationFile\n");
    exit(1);
}

$sql = file_get_contents($migrationFile);
$statements = array_filter(array_map('trim', preg_split('/;\s*\n/', $sql)));

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    foreach ($statements as $statement) {
        if ($statement === '') {
            continue;
        }
        echo "Executing: " . substr(str_replace("\n", ' ', $statement), 0, 80) . "...\n";
        $pdo->exec($statement);
    }
    echo "Migration 068 terminée.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false || strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "Migration déjà appliquée (colonnes/index existants).\n";
        exit(0);
    }
    fwrite(STDERR, 'Erreur : ' . $e->getMessage() . "\n");
    exit(1);
}
