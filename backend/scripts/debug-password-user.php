#!/usr/bin/env php
<?php
/**
 * Diagnostic mot de passe (prod/dev) — usage:
 *   php scripts/debug-password-user.php email@example.com 'PlainPassword'
 */
$baseDir = dirname(__DIR__);
$envFile = $baseDir . '/../.env';
if (!file_exists($envFile)) {
    $envFile = '/var/www/oneandlab/.env';
}
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

require_once $baseDir . '/models/User.php';

$email = $argv[1] ?? '';
$plain = $argv[2] ?? null;

if ($email === '') {
    fwrite(STDERR, "Usage: php debug-password-user.php email [password]\n");
    exit(1);
}

$emailHash = hash('sha256', strtolower($email));
$userModel = new User();
$user = $userModel->findByEmailHash($emailHash);

if (!$user) {
    echo "USER_NOT_FOUND email_hash=$emailHash\n";
    exit(2);
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
$stmt = $pdo->prepare('SELECT password_hash, password_set_at, must_change_password FROM profiles WHERE id = ?');
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo 'user_id=' . $user['id'] . "\n";
echo 'role=' . ($user['role'] ?? '') . "\n";
echo 'has_password=' . (!empty($row['password_hash']) ? 'yes' : 'no') . "\n";
echo 'password_set_at=' . ($row['password_set_at'] ?? 'null') . "\n";
echo 'must_change_password=' . ($row['must_change_password'] ?? '0') . "\n";

if ($plain !== null && !empty($row['password_hash'])) {
    $ok = password_verify($plain, $row['password_hash']);
    echo 'password_verify=' . ($ok ? 'OK' : 'FAIL') . "\n";
    if (!$ok) {
        // Variantes courantes
        $variants = [
            rtrim($plain),
            trim($plain),
            $plain . '.',
            rtrim($plain, '.'),
        ];
        foreach (array_unique($variants) as $v) {
            if ($v === $plain) {
                continue;
            }
            if (password_verify($v, $row['password_hash'])) {
                echo "password_verify_variant_OK=" . json_encode($v) . "\n";
            }
        }
    }
}
