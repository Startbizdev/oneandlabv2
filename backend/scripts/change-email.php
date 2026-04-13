#!/usr/bin/env php
<?php
/**
 * Change un email dans la table profiles (chiffré)
 * Usage: php scripts/change-email.php <ancien_email> <nouveau_email>
 */

$oldEmail = $argv[1] ?? null;
$newEmail = $argv[2] ?? null;

if (!$oldEmail || !$newEmail) {
    fwrite(STDERR, "Usage: php scripts/change-email.php <ancien_email> <nouveau_email>\n");
    exit(1);
}

$oldEmail = trim(strtolower($oldEmail));
$newEmail = trim(strtolower($newEmail));

$backendDir = dirname(__DIR__);
require_once $backendDir . '/config/database.php';
require_once $backendDir . '/lib/Crypto.php';

$config = require $backendDir . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$emailHash = hash('sha256', $oldEmail);

$stmt = $db->prepare('SELECT id, role, email_encrypted, email_dek FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    fwrite(STDERR, "Aucun profil trouvé avec l'email: $oldEmail\n");
    exit(1);
}

$crypto = new Crypto();
$newEmailData = $crypto->encryptField($newEmail);
$newHash = hash('sha256', $newEmail);

$upd = $db->prepare('UPDATE profiles SET email_encrypted = ?, email_dek = ?, email_hash = ? WHERE id = ?');
$upd->execute([
    $newEmailData['encrypted'],
    $newEmailData['dek'],
    $newHash,
    $profile['id'],
]);

echo "✅ Email mis à jour pour le profil {$profile['id']} (role: {$profile['role']})\n";
echo "   $oldEmail → $newEmail\n";
