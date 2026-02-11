<?php
/**
 * Vérifie si admin@test.com a le rôle super_admin
 * Usage: php check-admin-role.php
 */

require_once __DIR__ . '/config/database.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);

try {
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
} catch (PDOException $e) {
    die("Erreur connexion DB: " . $e->getMessage() . "\n");
}

$email = 'admin@test.com';
$emailHash = hash('sha256', strtolower($email));

$stmt = $db->prepare('SELECT id, role, created_at FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ admin@test.com n'existe PAS dans la base.\n";
    exit(1);
}

$isAdmin = $user['role'] === 'super_admin';
echo "Email: admin@test.com\n";
echo "ID: {$user['id']}\n";
echo "Rôle actuel: {$user['role']}\n";
echo "Est super admin: " . ($isAdmin ? "OUI ✓" : "NON ✗") . "\n";

if (!$isAdmin) {
    echo "\n→ Le rôle doit être 'super_admin'. Correction possible:\n";
    echo "  UPDATE profiles SET role = 'super_admin' WHERE email_hash = '$emailHash';\n";
    exit(1);
}
