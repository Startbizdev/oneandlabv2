#!/usr/bin/env php
<?php
/**
 * Définit city_plain pour un infirmier (nécessaire pour apparaître sur /infirmiers/ville/[ville])
 * Usage: php scripts/set-nurse-city.php <email> <ville>
 */

$email = $argv[1] ?? null;
$city = $argv[2] ?? null;

if (!$email || !$city) {
    fwrite(STDERR, "Usage: php scripts/set-nurse-city.php <email> <ville>\n");
    exit(1);
}

$email = trim(strtolower($email));
$city = trim($city);

$backendDir = dirname(__DIR__);
require_once $backendDir . '/config/database.php';

$config = require $backendDir . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $db->query("SHOW COLUMNS FROM profiles LIKE 'city_plain'");
if ($stmt->rowCount() === 0) {
    fwrite(STDERR, "La colonne city_plain n'existe pas. Exécutez la migration 027.\n");
    exit(1);
}

$emailHash = hash('sha256', $email);
$stmt = $db->prepare('SELECT id, role, public_slug, is_public_profile_enabled, city_plain FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    fwrite(STDERR, "Aucun profil trouvé avec l'email: $email\n");
    exit(1);
}

if ($profile['role'] !== 'nurse') {
    fwrite(STDERR, "Le profil n'est pas un infirmier (role: {$profile['role']})\n");
    exit(1);
}

$upd = $db->prepare('UPDATE profiles SET city_plain = ? WHERE id = ?');
$upd->execute([$city, $profile['id']]);

echo "✅ city_plain mis à jour pour le profil {$profile['id']}\n";
echo "   Ville: {$city}\n";
echo "   public_slug: " . ($profile['public_slug'] ?: '(vide)') . "\n";
echo "   is_public_profile_enabled: " . ($profile['is_public_profile_enabled'] ? 'oui' : 'non') . "\n";
if (empty($profile['public_slug']) || !$profile['is_public_profile_enabled']) {
    echo "\n⚠️  Pour apparaître sur /infirmiers/ville/{$city}, activez le profil public et définissez un slug.\n";
}
