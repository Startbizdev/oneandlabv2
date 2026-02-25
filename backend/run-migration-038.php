<?php
/**
 * Exécute la migration 038 (emploi sur registration_requests et profiles pour les pros).
 *
 * Usage : php run-migration-038.php
 */

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

echo "Migration 038 : emploi (registration_requests + profiles)\n";

$migrations = [
    'registration_requests' => "ALTER TABLE registration_requests ADD COLUMN emploi VARCHAR(120) NULL AFTER company_name_dek",
    'profiles' => "ALTER TABLE profiles ADD COLUMN emploi VARCHAR(120) NULL AFTER adeli_dek",
];

foreach ($migrations as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "  [OK] Colonne emploi ajoutée à {$name}.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "  [OK] Migration déjà appliquée (emploi existe sur {$name}).\n";
        } else {
            throw $e;
        }
    }
}

echo "Terminé.\n";
