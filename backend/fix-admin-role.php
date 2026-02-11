<?php
/**
 * Corrige le rôle de admin@test.com en super_admin
 * Usage: php fix-admin-role.php
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

$emailHash = hash('sha256', strtolower('admin@test.com'));
$stmt = $db->prepare('UPDATE profiles SET role = ? WHERE email_hash = ?');
$stmt->execute(['super_admin', $emailHash]);

$updated = $stmt->rowCount();
if ($updated > 0) {
    echo "✅ admin@test.com a maintenant le rôle super_admin.\n";
} else {
    echo "ℹ️  Aucune mise à jour (rôle déjà correct ou utilisateur absent).\n";
}
