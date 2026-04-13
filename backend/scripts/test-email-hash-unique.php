#!/usr/bin/env php
<?php

/**
 * Vérifie qu’il n’y a pas de doublon email_hash et que l’index UNIQUE existe.
 * Usage (depuis backend/) : php scripts/test-email-hash-unique.php
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

require_once $baseDir . '/models/User.php';

$user = new User();
$dups = $user->countDuplicateEmailHashes();
if ($dups !== 0) {
    fwrite(STDERR, "FAIL: {$dups} email_hash dupliqué(s)\n");
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
$idx = $pdo->query("SHOW INDEX FROM profiles WHERE Key_name = 'uq_profiles_email_hash'")->fetchAll();
if (count($idx) === 0) {
    fwrite(STDERR, "FAIL: index uq_profiles_email_hash absent\n");
    exit(1);
}

echo "OK: aucun doublon email_hash, index UNIQUE présent.\n";
exit(0);
