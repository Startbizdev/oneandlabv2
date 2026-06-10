#!/usr/bin/env php
<?php
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
require_once $baseDir . '/models/User.php';

$needle = strtolower($argv[1] ?? 'chloeidel');
$config = require $baseDir . '/config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

$userModel = new User();
$stmt = $pdo->query("SELECT id, role, email_hash, password_hash, password_set_at FROM profiles ORDER BY updated_at DESC LIMIT 500");
$found = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $email = $userModel->getDecryptedEmail($row['id']);
    if ($email && str_contains(strtolower($email), $needle)) {
        $found++;
        $hash = $row['password_hash'] ?? '';
        echo "id={$row['id']} role={$row['role']} email={$email}\n";
        echo 'has_password=' . ($hash !== '' && $hash !== null ? 'yes' : 'no') . "\n";
        echo 'password_set_at=' . ($row['password_set_at'] ?? 'null') . "\n";
        if (isset($argv[2]) && $hash) {
            echo 'verify=' . (password_verify($argv[2], $hash) ? 'OK' : 'FAIL') . "\n";
        }
        echo "---\n";
    }
}
if ($found === 0) {
    echo "NO_MATCH for needle=$needle\n";
}
