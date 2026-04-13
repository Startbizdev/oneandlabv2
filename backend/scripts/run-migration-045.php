#!/usr/bin/env php
<?php

/**
 * Exécute la migration 045 (ajout statut 'planned' aux appointments)
 * Usage: php run-migration-045.php
 * Depuis backend/ : php scripts/run-migration-045.php
 * Sur le serveur : cd /var/www/oneandlab/backend && php scripts/run-migration-045.php
 */

$baseDir = dirname(__DIR__);

// Charger la config DB
$envFile = $baseDir . '/../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../../.env';
}
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
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

echo "=== Migration 045 : add 'planned' status to appointments ===\n";
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

    $migrationFile = $baseDir . '/../database/migrations/045_add_planned_status_to_appointments.sql';
    if (!file_exists($migrationFile)) {
        $migrationFile = __DIR__ . '/../../database/migrations/045_add_planned_status_to_appointments.sql';
    }
    if (!file_exists($migrationFile)) {
        throw new RuntimeException("Fichier migration 045 introuvable");
    }
    $sql = file_get_contents($migrationFile);
    $pdo->exec($sql);
    echo "✅ Migration 045 exécutée avec succès.\n";
    exit(0);
} catch (PDOException $e) {
    fwrite(STDERR, "❌ Erreur: " . $e->getMessage() . "\n");
    exit(1);
}
