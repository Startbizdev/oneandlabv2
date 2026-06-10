#!/usr/bin/env php
<?php
/** Rapport doublons email / profils chloeidel8 */
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

$config = require $baseDir . '/config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

$userModel = new User();

echo "=== INDEX email_hash ===\n";
$idx = $pdo->query("SHOW INDEX FROM profiles WHERE Key_name = 'uq_profiles_email_hash'")->fetchAll(PDO::FETCH_ASSOC);
echo 'unique_index=' . (count($idx) ? 'present' : 'ABSENT') . "\n";

echo "\n=== DOUBLONS email_hash (COUNT>1) ===\n";
$dups = $pdo->query('SELECT email_hash, COUNT(*) AS c FROM profiles GROUP BY email_hash HAVING c > 1')->fetchAll(PDO::FETCH_ASSOC);
echo 'duplicate_groups=' . count($dups) . "\n";
foreach ($dups as $d) {
    echo "hash={$d['email_hash']} count={$d['c']}\n";
    $q = $pdo->prepare('SELECT id, role, created_at, updated_at, password_hash IS NOT NULL AS has_pwd FROM profiles WHERE email_hash = ? ORDER BY created_at');
    $q->execute([$d['email_hash']]);
    while ($row = $q->fetch(PDO::FETCH_ASSOC)) {
        $email = $userModel->getDecryptedEmail($row['id']);
        echo '  - ' . json_encode(array_merge($row, ['email_decrypted' => $email]), JSON_UNESCAPED_UNICODE) . "\n";
    }
}

$needle = $argv[1] ?? 'chloeidel8';
echo "\n=== PROFILS contenant \"$needle\" (email déchiffré) ===\n";
$stmt = $pdo->query('SELECT id, role, email_hash, created_at, updated_at, password_hash IS NOT NULL AS has_pwd FROM profiles ORDER BY created_at');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $email = $userModel->getDecryptedEmail($row['id']);
    if ($email && stripos($email, $needle) !== false) {
        echo json_encode(array_merge($row, ['email' => $email]), JSON_UNESCAPED_UNICODE) . "\n";
    }
}

echo "\n=== COLONNES created_by (si existent) sample ===\n";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM profiles LIKE 'created_by%'")->fetchAll(PDO::FETCH_COLUMN);
    echo 'cols=' . implode(',', $cols) . "\n";
} catch (Throwable $e) {
    echo 'cols=unknown' . "\n";
}
