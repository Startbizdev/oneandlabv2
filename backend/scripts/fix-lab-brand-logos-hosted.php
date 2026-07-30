<?php
/** Met à jour les logos hébergés Cary (Unilabs, Cerballiance, B2A). */
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$logos = [
    'labio' => 'labio.png',
    'labo-sud' => 'labo-sud.png',
    'unilabs' => 'unilabs.jpg',
    'cerballiance' => 'cerballiance.jpg',
    'b2a' => 'b2a.jpg',
];

$stmt = $db->prepare('UPDATE lab_brands SET logo_url = ?, updated_at = NOW() WHERE slug = ?');
foreach ($logos as $slug => $file) {
    $url = 'https://cary.bio/api/public/lab-brands/logo?name=' . rawurlencode($file);
    $stmt->execute([$url, $slug]);
    echo 'OK: ' . $slug . ' -> ' . $url . PHP_EOL;
}
