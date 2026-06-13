<?php
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'nir_encrypted'");
$ok = $stmt && $stmt->rowCount() > 0;
echo $ok ? "nir_encrypted: OK\n" : "nir_encrypted: MISSING\n";
exit($ok ? 0 : 1);
