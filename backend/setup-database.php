<?php

/**
 * Script de setup de la base de données
 * Exécute toutes les migrations et crée des utilisateurs de test pour chaque rôle
 * 
 * Usage: php setup-database.php
 * Ou via navigateur: http://localhost:8888/backend/setup-database.php
 */

require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/encryption.php';

// Charger les variables d'environnement si .env existe
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($value);
            }
        }
    }
}

// Configuration
$dbConfig = require __DIR__ . '/config/database.php';
$migrationsDir = __DIR__ . '/../database/migrations';
$seedsDir = __DIR__ . '/../database/seeds';

// Connexion à la base de données
try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['charset']
    );
    
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $dbConfig['options']);
    
    // Créer la base de données si elle n'existe pas
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbConfig['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbConfig['database']}`");
    
    echo "✓ Connexion à la base de données réussie\n";
} catch (PDOException $e) {
    die("✗ Erreur de connexion à la base de données: " . $e->getMessage() . "\n");
}

// Initialiser le chiffrement
try {
    $crypto = new Crypto();
    echo "✓ Chiffrement initialisé\n";
} catch (Exception $e) {
    die("✗ Erreur d'initialisation du chiffrement: " . $e->getMessage() . "\n");
}

// Fonction pour exécuter un fichier SQL
function executeSqlFile(PDO $pdo, string $filePath): void
{
    if (!file_exists($filePath)) {
        throw new Exception("Fichier introuvable: $filePath");
    }
    
    $sql = file_get_contents($filePath);
    
    // Supprimer les commentaires SQL qui pourraient causer des problèmes
    $sql = preg_replace('/--.*$/m', '', $sql);
    
    // Séparer les requêtes
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        fn($stmt) => !empty($stmt) && !preg_match('/^\s*$/', $stmt)
    );
    
    foreach ($statements as $statement) {
        if (!empty(trim($statement))) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // Ignorer les erreurs "table already exists" pour les migrations
                if (strpos($e->getMessage(), 'already exists') === false) {
                    throw $e;
                }
            }
        }
    }
}

// Exécuter toutes les migrations dans l'ordre
echo "\n📦 Exécution des migrations...\n";
$migrationFiles = glob($migrationsDir . '/*.sql');
sort($migrationFiles);

foreach ($migrationFiles as $migrationFile) {
    $filename = basename($migrationFile);
    echo "  → $filename\n";
    try {
        executeSqlFile($pdo, $migrationFile);
    } catch (Exception $e) {
        echo "    ⚠ " . $e->getMessage() . "\n";
    }
}

// Exécuter les seeds
echo "\n🌱 Exécution des seeds...\n";
$seedFiles = glob($seedsDir . '/*.sql');
sort($seedFiles);

foreach ($seedFiles as $seedFile) {
    $filename = basename($seedFile);
    echo "  → $filename\n";
    try {
        executeSqlFile($pdo, $seedFile);
    } catch (Exception $e) {
        echo "    ⚠ " . $e->getMessage() . "\n";
    }
}

// Fonction pour créer un utilisateur avec chiffrement
function createUser(PDO $pdo, Crypto $crypto, string $role, string $email, string $firstName, string $lastName, ?string $phone = null): string
{
    $id = bin2hex(random_bytes(16));
    $uuid = sprintf(
        '%08s-%04s-%04s-%04s-%012s',
        substr($id, 0, 8),
        substr($id, 8, 4),
        substr($id, 12, 4),
        substr($id, 16, 4),
        substr($id, 20, 12)
    );
    
    // Chiffrer les données
    $emailData = $crypto->encryptField($email);
    $emailHash = hash('sha256', strtolower($email));
    
    $firstNameData = $crypto->encryptField($firstName);
    $lastNameData = $crypto->encryptField($lastName);
    
    $phoneData = null;
    if ($phone) {
        $phoneData = $crypto->encryptField($phone);
    }
    
    // Préparer la requête
    $sql = "INSERT INTO profiles (
        id, role,
        email_encrypted, email_dek, email_hash,
        first_name_encrypted, first_name_dek,
        last_name_encrypted, last_name_dek";
    
    $values = "VALUES (
        :id, :role,
        :email_encrypted, :email_dek, :email_hash,
        :first_name_encrypted, :first_name_dek,
        :last_name_encrypted, :last_name_dek";
    
    $params = [
        ':id' => $uuid,
        ':role' => $role,
        ':email_encrypted' => $emailData['encrypted'],
        ':email_dek' => $emailData['dek'],
        ':email_hash' => $emailHash,
        ':first_name_encrypted' => $firstNameData['encrypted'],
        ':first_name_dek' => $firstNameData['dek'],
        ':last_name_encrypted' => $lastNameData['encrypted'],
        ':last_name_dek' => $lastNameData['dek'],
    ];
    
    if ($phoneData) {
        $sql .= ", phone_encrypted, phone_dek";
        $values .= ", :phone_encrypted, :phone_dek";
        $params[':phone_encrypted'] = $phoneData['encrypted'];
        $params[':phone_dek'] = $phoneData['dek'];
    }
    
    $sql .= ") " . $values . ")";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $uuid;
}

// Créer les utilisateurs de test
echo "\n👥 Création des utilisateurs de test...\n";

$users = [
    ['role' => 'super_admin', 'email' => 'admin@oneandlab.fr', 'firstName' => 'Admin', 'lastName' => 'OneAndLab', 'phone' => '0612345678'],
    ['role' => 'lab', 'email' => 'lab@oneandlab.fr', 'firstName' => 'Laboratoire', 'lastName' => 'Test', 'phone' => '0612345679'],
    ['role' => 'subaccount', 'email' => 'subaccount@oneandlab.fr', 'firstName' => 'Sous-compte', 'lastName' => 'Test', 'phone' => '0612345680'],
    ['role' => 'preleveur', 'email' => 'preleveur@oneandlab.fr', 'firstName' => 'Préleveur', 'lastName' => 'Test', 'phone' => '0612345681'],
    ['role' => 'nurse', 'email' => 'infirmier@oneandlab.fr', 'firstName' => 'Infirmier', 'lastName' => 'Test', 'phone' => '0612345682'],
    ['role' => 'pro', 'email' => 'pro@oneandlab.fr', 'firstName' => 'Professionnel', 'lastName' => 'Test', 'phone' => '0612345683'],
    ['role' => 'patient', 'email' => 'patient@oneandlab.fr', 'firstName' => 'Patient', 'lastName' => 'Test', 'phone' => '0612345684'],
];

foreach ($users as $user) {
    try {
        $userId = createUser(
            $pdo,
            $crypto,
            $user['role'],
            $user['email'],
            $user['firstName'],
            $user['lastName'],
            $user['phone']
        );
        echo "  ✓ {$user['email']} ({$user['role']}) - ID: $userId\n";
    } catch (Exception $e) {
        echo "  ✗ Erreur pour {$user['email']}: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Setup terminé avec succès!\n";
echo "\n📧 Comptes créés:\n";
foreach ($users as $user) {
    echo "   - {$user['email']} ({$user['role']})\n";
}
echo "\n💡 Tous les mots de passe doivent être configurés via le système d'authentification OTP.\n";




