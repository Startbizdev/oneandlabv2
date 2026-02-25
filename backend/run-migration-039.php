<?php
/**
 * Exécute la migration 039 (appointment_id nullable dans medical_documents).
 * Les documents de profil (Carte Vitale, etc.) ne créent plus de faux rendez-vous.
 *
 * Usage : php run-migration-039.php
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

echo "Migration 039 : medical_documents.appointment_id nullable\n";

$sql = "ALTER TABLE medical_documents MODIFY COLUMN appointment_id CHAR(36) NULL";
try {
    $pdo->exec($sql);
    echo "  [OK] appointment_id est maintenant nullable.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate') !== false) {
        echo "  [OK] Migration déjà appliquée.\n";
    } else {
        throw $e;
    }
}

echo "Terminé.\n";
echo "\nNote : Les anciens \"rendez-vous\" créés pour les documents de profil (status=expired, adresse=\"Document de profil\") restent en base.\n";
echo "Pour les supprimer : DELETE FROM appointments WHERE status = 'expired' AND address_encrypted IS NOT NULL;\n";
echo "(ou les supprimer un par un depuis l'admin si besoin).\n";
