<?php
/**
 * Insère des logs de test pour la page admin
 * Usage: php seed-logs.php
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Logger.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'], $config['port'], $config['database'], $config['charset']);

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
} catch (PDOException $e) {
    die("Erreur connexion DB: " . $e->getMessage() . "\n");
}

// Récupérer un user_id existant
$stmt = $pdo->query('SELECT id FROM profiles LIMIT 1');
$userId = $stmt->fetchColumn();
if (!$userId) {
    die("Aucun profil en base. Créez d'abord un utilisateur.\n");
}

$logger = new Logger();

$actions = [
    ['action' => 'view', 'resource_type' => 'appointment'],
    ['action' => 'create', 'resource_type' => 'appointment'],
    ['action' => 'update', 'resource_type' => 'profile'],
    ['action' => 'decrypt', 'resource_type' => 'profile'],
    ['action' => 'view', 'resource_type' => 'review'],
];

foreach ($actions as $a) {
    $logger->log(
        $userId,
        'super_admin',
        $a['action'],
        $a['resource_type'],
        null,
        ['test' => true],
        '127.0.0.1',
        'Seed script'
    );
}

echo "✅ " . count($actions) . " logs de test insérés.\n";
