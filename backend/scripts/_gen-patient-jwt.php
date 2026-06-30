<?php
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../config/database.php';
$config = require __DIR__ . '/../config/database.php';
$db = new PDO(
    'mysql:host=' . $config['host'] . ';dbname=' . $config['database'],
    $config['username'],
    $config['password']
);
$stmt = $db->prepare('SELECT id FROM profiles WHERE role = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute(['patient']);
$id = $stmt->fetchColumn();
$auth = new Auth();
echo $auth->generateJWT((string) $id, 'patient');
