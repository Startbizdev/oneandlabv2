<?php
/**
 * Exécute la migration 037 (created_by sur profiles pour lier les patients au pro).
 *
 * Usage : php run-migration-037.php
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

echo "Migration 037 : created_by sur profiles (patients créés par le pro)\n";

$sql = file_get_contents(__DIR__ . '/../database/migrations/037_add_created_by_to_profiles.sql');
// Retirer le USE pour éviter erreur si déjà sur la bonne DB
$sql = preg_replace('/^\s*USE\s+`?\w+`?\s*;/m', '', $sql);

try {
    $pdo->exec($sql);
    echo "  [OK] Colonne created_by et contraintes ajoutées.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "  [OK] Migration déjà appliquée (created_by existe).\n";
    } else {
        throw $e;
    }
}
