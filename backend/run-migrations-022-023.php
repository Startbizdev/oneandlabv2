<?php

/**
 * Exécute uniquement les migrations 022 et 023.
 * Usage: php run-migrations-022-023.php
 */

$envFile = __DIR__ . '/../.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($value);
            }
        }
    }
}

$dbConfig = require __DIR__ . '/config/database.php';
$migrationsDir = __DIR__ . '/../database/migrations';

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['charset']
    );
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $dbConfig['options']);
    $pdo->exec("USE `{$dbConfig['database']}`");
    echo "✓ Connexion à la base de données réussie\n";
} catch (PDOException $e) {
    die("✗ Erreur de connexion: " . $e->getMessage() . "\n");
}

function executeSqlFile(PDO $pdo, string $filePath): void
{
    if (!file_exists($filePath)) {
        throw new Exception("Fichier introuvable: $filePath");
    }
    $sql = file_get_contents($filePath);
    $sql = preg_replace('/--.*$/m', '', $sql);
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        fn($stmt) => !empty($stmt) && !preg_match('/^\s*$/', $stmt)
    );
    foreach ($statements as $statement) {
        if (!empty(trim($statement))) {
            try {
                $pdo->exec($statement);
                echo "  ✓ Requête exécutée\n";
            } catch (PDOException $e) {
                $msg = $e->getMessage();
                if (strpos($msg, 'already exists') !== false || strpos($msg, 'Duplicate column') !== false) {
                    echo "  ⚠ Déjà appliqué: " . $msg . "\n";
                } else {
                    throw $e;
                }
            }
        }
    }
}

$files = ['022_add_adeli_to_profiles.sql', '023_create_registration_requests.sql'];
echo "\n📦 Exécution des migrations 022 et 023...\n";
foreach ($files as $filename) {
    $path = $migrationsDir . '/' . $filename;
    echo "  → $filename\n";
    try {
        executeSqlFile($pdo, $path);
    } catch (Exception $e) {
        echo "    ✗ " . $e->getMessage() . "\n";
        exit(1);
    }
}
echo "\n✅ Migrations 022 et 023 terminées.\n";
