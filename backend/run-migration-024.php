<?php
/**
 * Exécute la migration 024 (company_name sur profiles) puis attribue des noms
 * factices aux profils lab et subaccount.
 *
 * Usage : php run-migration-024.php
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/lib/Logger.php';
require_once __DIR__ . '/models/User.php';

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

echo "Migration 024 : company_name sur profiles\n";

try {
    $sql = file_get_contents(__DIR__ . '/../database/migrations/024_add_company_name_to_profiles.sql');
    $pdo->exec($sql);
    echo "  [OK] Colonnes company_name_encrypted / company_name_dek ajoutées.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "  [OK] Colonnes déjà présentes.\n";
    } else {
        throw $e;
    }
}

$userModel = new User();
$stmt = $pdo->query("SELECT id, role FROM profiles WHERE role = 'super_admin' LIMIT 1");
$actor = $stmt->fetch(PDO::FETCH_ASSOC);
$actorId = $actor['id'] ?? null;
$actorRole = $actor['role'] ?? 'super_admin';
if (!$actorId) {
    $stmt = $pdo->query("SELECT id, role FROM profiles LIMIT 1");
    $actor = $stmt->fetch(PDO::FETCH_ASSOC);
    $actorId = $actor['id'];
    $actorRole = $actor['role'];
}

$labNames = [
    'Labo Marseille Nord',
    'Labo La Timone',
    'Labo Sainte-Marguerite',
    'Labo Analyses Prado',
    'Labo République',
    'Labo Vieux-Port',
];
$subaccountNames = [
    'Sous-compte Labo Marseille Nord',
    'Sous-compte Labo La Timone',
    'Sous-compte Analyses Prado',
    'Sous-compte Prélèvements Sud',
    'Sous-compte Labo République',
];

$stmt = $pdo->query("SELECT id, role FROM profiles WHERE role IN ('lab', 'subaccount') ORDER BY role, id");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\nNoms factices pour " . count($profiles) . " profil(s) lab / subaccount\n";

$labIndex = 0;
$subIndex = 0;
foreach ($profiles as $p) {
    if ($p['role'] === 'lab') {
        $name = $labNames[$labIndex % count($labNames)];
        $labIndex++;
    } else {
        $name = $subaccountNames[$subIndex % count($subaccountNames)];
        $subIndex++;
    }
    try {
        $userModel->update($p['id'], ['company_name' => $name], $actorId, $actorRole);
        echo "  [OK] {$p['id']} ({$p['role']}) → {$name}\n";
    } catch (Throwable $e) {
        echo "  [ERREUR] {$p['id']}: " . $e->getMessage() . "\n";
    }
}

echo "\nTerminé.\n";
