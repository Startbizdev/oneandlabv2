#!/usr/bin/env php
<?php
/**
 * Passe un infirmier (identifié par son email) en abonnement nurse_pro (actif).
 * Usage (sur le serveur ou en local, depuis la racine du repo) :
 *   php backend/scripts/set-nurse-pro-by-email.php infirmier@example.com
 */

if (php_sapi_name() !== 'cli') {
    die('Ce script doit être exécuté en ligne de commande.');
}

$email = $argv[1] ?? '';
if ($email === '') {
    echo "Usage: php set-nurse-pro-by-email.php <email>\n";
    echo "Exemple: php set-nurse-pro-by-email.php infirmier@example.com\n";
    exit(1);
}

$email = trim(strtolower($email));
$emailHash = hash('sha256', $email);

$baseDir = dirname(__DIR__);
$config = require $baseDir . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $pdo->prepare("SELECT id, role FROM profiles WHERE email_hash = ? AND role = 'nurse' LIMIT 1");
$stmt->execute([$emailHash]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
    echo "Aucun infirmier trouvé avec l'email : $email\n";
    exit(1);
}

$userId = $profile['id'];
echo "Infirmier trouvé : user_id = $userId\n";

$stmt = $pdo->prepare('SELECT id, plan_slug, status FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute([$userId]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

if ($sub) {
    $pdo->prepare("UPDATE subscriptions SET plan_slug = 'nurse_pro', status = 'active', updated_at = NOW() WHERE user_id = ?")
        ->execute([$userId]);
    echo "Abonnement mis à jour : plan_slug = nurse_pro, status = active\n";
} else {
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0x0fff) | 0x4000, random_int(0, 0x3fff) | 0x8000, random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff));
    $stmt = $pdo->prepare('INSERT INTO subscriptions (id, user_id, plan_slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([$id, $userId, 'nurse_pro', 'active']);
    echo "Abonnement créé : plan_slug = nurse_pro, status = active\n";
}

echo "OK.\n";
exit(0);
