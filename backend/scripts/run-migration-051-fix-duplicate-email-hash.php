#!/usr/bin/env php
<?php

/**
 * Migration 051 : supprime les doublons email_hash (patients délégués) puis ajoute contrainte UNIQUE.
 * Usage (depuis backend/) : php scripts/run-migration-051-fix-duplicate-email-hash.php
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

require_once $baseDir . '/models/User.php';

echo "=== Migration 051 : email_hash unique (backfill + SQL) ===\n";

try {
    $userModel = new User();
    $beforeDup = $userModel->countDuplicateEmailHashes();
    echo "Doublons email_hash avant correction : {$beforeDup}\n";

    $fixed = $userModel->migrateDuplicateEmailHashesForPatients();
    echo "Profils patients réécrits : {$fixed}\n";

    $afterDup = $userModel->countDuplicateEmailHashes();
    echo "Doublons email_hash après correction : {$afterDup}\n";

    if ($afterDup > 0) {
        fwrite(STDERR, "❌ Des doublons subsistent : intervention manuelle requise.\n");
        exit(1);
    }

    $config = require $baseDir . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    $check = $pdo->query("SHOW INDEX FROM profiles WHERE Key_name = 'uq_profiles_email_hash'")->fetchAll();
    if (count($check) > 0) {
        echo "Index uq_profiles_email_hash déjà présent — rien à faire.\n";
        exit(0);
    }

    $migrationFile = $baseDir . '/../database/migrations/051_unique_email_hash.sql';
    if (!file_exists($migrationFile)) {
        $migrationFile = __DIR__ . '/../../database/migrations/051_unique_email_hash.sql';
    }
    if (!file_exists($migrationFile)) {
        throw new RuntimeException('Fichier migration 051 introuvable');
    }
    $sql = file_get_contents($migrationFile);
    $pdo->exec($sql);
    echo "✅ Migration 051 (UNIQUE email_hash) exécutée avec succès.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, '❌ Erreur: ' . $e->getMessage() . "\n");
    exit(1);
}
