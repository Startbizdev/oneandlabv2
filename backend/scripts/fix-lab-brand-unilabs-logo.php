<?php
/** Met à jour le logo Unilabs — idempotent. */
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$logo = 'https://cary.bio/api/public/lab-brands/logo?name=unilabs.jpg';
$stmt = $db->prepare('UPDATE lab_brands SET logo_url = ?, updated_at = NOW() WHERE slug = ?');
$stmt->execute([$logo, 'unilabs']);
echo $stmt->rowCount() > 0 ? "OK: logo Unilabs -> $logo\n" : "SKIP: slug unilabs introuvable\n";
