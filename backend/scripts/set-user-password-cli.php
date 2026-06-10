#!/usr/bin/env php
<?php
/** Reset MDP utilisateur (CLI ops) — must_change_password=0 */
$baseDir = dirname(__DIR__);
$envFile = '/var/www/oneandlab/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$n, $v] = explode('=', $line, 2);
        $_ENV[trim($n)] = trim($v);
    }
}

require_once $baseDir . '/lib/Validation.php';
require_once $baseDir . '/models/User.php';

$email = $argv[1] ?? '';
$password = $argv[2] ?? '';
if ($email === '' || $password === '') {
    fwrite(STDERR, "Usage: php set-user-password-cli.php email password\n");
    exit(1);
}

$check = Validation::password($password, $email);
if (!$check['valid']) {
    fwrite(STDERR, ($check['error'] ?? 'invalid') . "\n");
    exit(1);
}

$userModel = new User();
$user = $userModel->findByEmailHash(hash('sha256', strtolower($email)));
if (!$user) {
    fwrite(STDERR, "USER_NOT_FOUND\n");
    exit(2);
}

$config = require $baseDir . '/config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare('UPDATE profiles SET password_hash = ?, password_set_at = NOW(), must_change_password = 0, updated_at = NOW() WHERE id = ?');
$stmt->execute([$hash, $user['id']]);

$ok = password_verify($password, $hash);
echo "user_id={$user['id']} role={$user['role']} email=$email\n";
echo 'updated=' . ($stmt->rowCount() > 0 ? 'yes' : 'no') . " verify=" . ($ok ? 'OK' : 'FAIL') . "\n";
