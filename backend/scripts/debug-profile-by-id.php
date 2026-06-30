#!/usr/bin/env php
<?php
/** Usage: php scripts/debug-profile-by-id.php <uuid> */
$id = $argv[1] ?? '';
if ($id === '') {
    fwrite(STDERR, "Usage: php scripts/debug-profile-by-id.php <profile_id>\n");
    exit(1);
}
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();
$stmt = $db->prepare('SELECT * FROM profiles WHERE id = ?');
$stmt->execute([$id]);
$p = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$p) {
    echo "Profil introuvable\n";
    exit(1);
}
foreach (['email', 'first_name', 'last_name', 'phone', 'adeli', 'rpps'] as $f) {
    $enc = $p[$f . '_encrypted'] ?? null;
    $dek = $p[$f . '_dek'] ?? null;
    $val = ($enc && $dek) ? $crypto->decryptField($enc, $dek) : '';
    echo ucfirst($f) . ": {$val}\n";
}
echo "Role: {$p['role']}\n";
echo "public_slug: " . ($p['public_slug'] ?? '') . "\n";
echo "is_public_profile_enabled: " . ($p['is_public_profile_enabled'] ?? '') . "\n";
echo "created_at: {$p['created_at']}\n";
