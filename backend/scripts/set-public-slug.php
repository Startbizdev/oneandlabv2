#!/usr/bin/env php
<?php
/**
 * Change le public_slug d'un profil (nurse, lab, subaccount)
 * Usage: php scripts/set-public-slug.php <email> <nouveau_slug>
 */

$email = $argv[1] ?? null;
$newSlug = $argv[2] ?? null;

if (!$email || !$newSlug) {
    fwrite(STDERR, "Usage: php scripts/set-public-slug.php <email> <nouveau_slug>\n");
    exit(1);
}

$email = trim(strtolower($email));
$newSlug = trim(strtolower($newSlug));
$newSlug = preg_replace('/[^a-z0-9-]/', '-', $newSlug);
$newSlug = preg_replace('/-+/', '-', trim($newSlug, '-'));

if ($newSlug === '') {
    fwrite(STDERR, "Slug invalide.\n");
    exit(1);
}

$backendDir = dirname(__DIR__);
require_once $backendDir . '/config/database.php';

$config = require $backendDir . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$emailHash = hash('sha256', $email);
$stmt = $db->prepare('SELECT id, role, public_slug FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    fwrite(STDERR, "Aucun profil trouvé avec l'email: $email\n");
    exit(1);
}

$stmt = $db->prepare('SELECT id FROM profiles WHERE public_slug = ? AND id != ?');
$stmt->execute([$newSlug, $profile['id']]);
if ($stmt->fetch()) {
    fwrite(STDERR, "Le slug '$newSlug' est déjà utilisé par un autre profil.\n");
    exit(1);
}

$upd = $db->prepare('UPDATE profiles SET public_slug = ? WHERE id = ?');
$upd->execute([$newSlug, $profile['id']]);

echo "✅ public_slug mis à jour pour le profil {$profile['id']} (role: {$profile['role']})\n";
echo "   " . ($profile['public_slug'] ?: '(vide)') . " → $newSlug\n";
