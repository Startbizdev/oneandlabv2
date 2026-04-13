#!/usr/bin/env php
<?php

/**
 * Crée le compte patient Charle Barth pour les tests
 *
 * Usage: php scripts/create-charle-bart.php
 * Depuis: backend/ (cd backend && php scripts/create-charle-bart.php)
 */

$backendDir = dirname(__DIR__);
chdir($backendDir);

// Charger .env
$envFile = $backendDir . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

require_once $backendDir . '/config/database.php';
require_once $backendDir . '/models/User.php';

$email = 'charle.barth@test.oneandlab.fr';
$userModel = new User();

$emailHash = hash('sha256', strtolower($email));
$existing = $userModel->findByEmailHash($emailHash);

if ($existing) {
    echo "✅ Charle Barth existe déjà (ID: {$existing['id']})\n";
    exit(0);
}

try {
    $userId = $userModel->create([
        'email' => $email,
        'first_name' => 'Charle',
        'last_name' => 'Barth',
        'phone' => '0612345678',
        'role' => 'patient',
    ], 'system', 'system');
    echo "✅ Charle Barth créé (ID: $userId)\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}
