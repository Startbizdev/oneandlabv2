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
require_once $baseDir . '/lib/Auth.php';
$auth = new Auth();
try {
    $r = $auth->loginWithPassword($argv[1] ?? '', $argv[2] ?? '');
    echo ($r['success'] ?? false) ? "LOGIN_OK role=" . ($r['user']['role'] ?? '?') . "\n" : "LOGIN_FAIL\n";
} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . "\n";
    exit(1);
}
