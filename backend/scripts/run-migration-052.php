#!/usr/bin/env php
<?php

/**
 * Exécute la migration 052 (creation_batch_id sur appointments)
 * Usage: depuis backend/ → php scripts/run-migration-052.php
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

    $migrationFile = $baseDir . '/../database/migrations/052_appointments_creation_batch_id.sql';
    if (!file_exists($migrationFile)) {
        $migrationFile = __DIR__ . '/../../database/migrations/052_appointments_creation_batch_id.sql';
    }
    if (!file_exists($migrationFile)) {
        throw new RuntimeException('Fichier migration 052 introuvable');
    }
    $sql = file_get_contents($migrationFile);
    // Ignorer les lignes de commentaire ; PDO : une instruction par exec
    $lines = explode("\n", $sql);
    $withoutComments = array_filter($lines, static function ($line) {
        return !preg_match('/^\s*--/', $line);
    });
    $sqlClean = trim(implode("\n", $withoutComments));
    foreach (array_filter(array_map('trim', explode(';', $sqlClean))) as $stmt) {
        $pdo->exec($stmt);
    }
    echo "✅ Migration 052 exécutée avec succès.\n";
    exit(0);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    if (stripos($msg, 'Duplicate column') !== false || stripos($msg, 'already exists') !== false) {
        echo "ℹ️  Colonne ou index déjà présent — rien à faire.\n";
        exit(0);
    }
    fwrite(STDERR, '❌ Erreur: ' . $msg . "\n");
    exit(1);
}
