#!/usr/bin/env php
<?php

/**
 * Smoke test auth mot de passe (colonnes SQL + Validation + Auth helpers).
 * Usage (depuis backend/) : php scripts/test-password-auth.php
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
            if (empty($line) || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

require_once $baseDir . '/lib/Validation.php';
require_once $baseDir . '/lib/Auth.php';

$config = require $baseDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$columns = $pdo->query("SHOW COLUMNS FROM profiles LIKE 'password_hash'")->fetch();
if (!$columns) {
    fwrite(STDERR, "FAIL: colonne profiles.password_hash absente — exécutez migration 067\n");
    exit(1);
}

$table = $pdo->query("SHOW TABLES LIKE 'password_reset_tokens'")->fetch();
if (!$table) {
    fwrite(STDERR, "FAIL: table password_reset_tokens absente\n");
    exit(1);
}

$weak = Validation::password('abc');
if ($weak['valid'] ?? true) {
    fwrite(STDERR, "FAIL: Validation devrait rejeter mot de passe faible\n");
    exit(1);
}
$ok = Validation::password('SecurePass1');
if (!($ok['valid'] ?? false)) {
    fwrite(STDERR, "FAIL: Validation devrait accepter SecurePass1\n");
    exit(1);
}

$auth = new Auth();
$reflection = new ReflectionClass($auth);
if (!$reflection->hasMethod('loginWithPassword')) {
    fwrite(STDERR, "FAIL: Auth::loginWithPassword absent\n");
    exit(1);
}

echo "OK: migration password, Validation et Auth loginWithPassword présents.\n";
exit(0);
