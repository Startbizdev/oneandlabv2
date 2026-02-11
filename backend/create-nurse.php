<?php

/**
 * Script pour créer un infirmier avec l'email joopixstudio@gmail.com
 * Usage: php create-nurse.php
 */

require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/encryption.php';

// Charger les variables d'environnement
$envFile = __DIR__ . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

// Configuration
$dbConfig = require __DIR__ . '/config/database.php';

// Connexion à la base de données
try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['database'],
        $dbConfig['charset']
    );
    
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $dbConfig['options']);
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

// Fonction pour créer un utilisateur (identique à setup-database.php)
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

// Vérifier si l'utilisateur existe déjà
$email = 'joopixstudio@gmail.com';
$emailHash = hash('sha256', strtolower($email));

$stmt = $pdo->prepare('SELECT id, role FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingUser) {
    echo "\n⚠️  L'utilisateur avec l'email $email existe déjà.\n";
    echo "   ID: {$existingUser['id']}\n";
    echo "   Rôle: {$existingUser['role']}\n";
    
    if ($existingUser['role'] !== 'nurse') {
        echo "\n❌ L'utilisateur existe mais avec le rôle '{$existingUser['role']}' au lieu de 'nurse'.\n";
        echo "   Mise à jour du rôle vers 'nurse'...\n";
        
        $updateStmt = $pdo->prepare('UPDATE profiles SET role = ? WHERE id = ?');
        $updateStmt->execute(['nurse', $existingUser['id']]);
        
        echo "✅ Rôle mis à jour avec succès !\n";
    } else {
        echo "\n✅ L'utilisateur est déjà un infirmier. Vous pouvez tester le workflow OTP.\n";
    }
    exit(0);
}

// Créer le nouvel infirmier
try {
    $userId = createUser(
        $pdo,
        $crypto,
        'nurse',
        $email,
        'Joopix',
        'Studio',
        '0612345685'
    );
    
    echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "✅ Infirmier créé avec succès !\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    echo "📧 Email: $email\n";
    echo "👤 Nom: Joopix Studio\n";
    echo "📱 Téléphone: 0612345685\n";
    echo "🎭 Rôle: nurse\n";
    echo "🆔 ID: $userId\n\n";
    echo "💡 Vous pouvez maintenant tester le workflow OTP avec cet email.\n";
    echo "   L'OTP sera envoyé à: $email\n";
    
} catch (Exception $e) {
    echo "\n❌ Erreur: " . $e->getMessage() . "\n";
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
        echo "   L'utilisateur existe peut-être déjà avec un autre email hash.\n";
    }
    exit(1);
}

