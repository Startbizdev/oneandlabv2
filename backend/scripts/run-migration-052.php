#!/usr/bin/env php
<?php

/**
 * Ajoute creation_batch_id + index sur appointments (migration 052).
 * Idempotent : vérifie information_schema avant ALTER / CREATE INDEX.
 *
 * Usage : depuis backend/ → php scripts/run-migration-052.php
 */

$baseDir = dirname(__DIR__);

$envFile = $baseDir . '/../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../../.env';
}
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

$config = [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'port' => $_ENV['DB_PORT'] ?? 3306,
    'database' => $_ENV['DB_NAME'] ?? 'oneandlab',
    'username' => $_ENV['DB_USER'] ?? 'root',
    'password' => $_ENV['DB_PASS'] ?? '',
];

echo "=== Migration 052 : creation_batch_id sur appointments ===\n";
echo "DB: {$config['database']}@{$config['host']}\n";

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        (int) $config['port'],
        $config['database']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $dbName = $config['database'];

    $colCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = " . $pdo->quote($dbName) . "
           AND TABLE_NAME = 'appointments'
           AND COLUMN_NAME = 'creation_batch_id'"
    )->fetchColumn();

    if ($colCount === 0) {
        $pdo->exec(
            "ALTER TABLE appointments
             ADD COLUMN creation_batch_id CHAR(36) NULL DEFAULT NULL
             COMMENT 'UUID partagé par un lot de créations' AFTER id"
        );
        echo "✅ Colonne creation_batch_id ajoutée.\n";
    } else {
        echo "ℹ️  Colonne creation_batch_id déjà présente.\n";
    }

    $idxCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = " . $pdo->quote($dbName) . "
           AND TABLE_NAME = 'appointments'
           AND INDEX_NAME = 'idx_appointments_creation_batch_id'"
    )->fetchColumn();

    if ($idxCount === 0) {
        $pdo->exec('CREATE INDEX idx_appointments_creation_batch_id ON appointments (creation_batch_id)');
        echo "✅ Index idx_appointments_creation_batch_id créé.\n";
    } else {
        echo "ℹ️  Index idx_appointments_creation_batch_id déjà présent.\n";
    }

    echo "✅ Terminé. Exécutez ensuite la migration 055 si besoin (merged_into + appointment_blood_test_items).\n";
    exit(0);
} catch (PDOException $e) {
    fwrite(STDERR, '❌ Erreur: ' . $e->getMessage() . "\n");
    exit(1);
}
