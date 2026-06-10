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

$userId = $argv[1] ?? '31578932-0ee7-4bc7-b294-9347d229a311';
$newPassword = $argv[2] ?? null;

$config = require $baseDir . '/config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

if ($newPassword === null) {
    $tables = ['audit_logs', 'logs', 'activity_logs'];
    foreach ($tables as $t) {
        try {
            $s = $pdo->prepare("SELECT action, created_at FROM {$t} WHERE user_id = ? AND action LIKE '%password%' ORDER BY created_at DESC LIMIT 5");
            $s->execute([$userId]);
            $rows = $s->fetchAll(PDO::FETCH_ASSOC);
            if ($rows) {
                echo "table=$t\n";
                foreach ($rows as $r) {
                    echo json_encode($r) . "\n";
                }
            }
        } catch (Throwable $e) {
            // table may not exist
        }
    }
    exit(0);
}

require_once $baseDir . '/lib/Auth.php';
$auth = new Auth();
$result = $auth->adminSetTemporaryPassword($userId, $newPassword);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

require_once $baseDir . '/models/User.php';
$email = (new User())->getDecryptedEmail($userId);
echo "email=$email\n";
echo 'verify=' . (password_verify($newPassword, $pdo->query("SELECT password_hash FROM profiles WHERE id=" . $pdo->quote($userId))->fetchColumn()) ? 'OK' : 'FAIL') . "\n";
