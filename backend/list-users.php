<?php
require __DIR__ . '/config/database.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $pdo->query('SELECT id, email, role, first_name, last_name, status FROM users ORDER BY role LIMIT 50');

echo "USERS:\n";
echo "------\n";
while ($u = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo sprintf(
        "%s | %s | %s %s | %s\n",
        $u['role'],
        $u['email'],
        $u['first_name'] ?? 'N/A',
        $u['last_name'] ?? '',
        $u['status']
    );
}
