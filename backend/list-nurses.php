<?php

/**
 * Script pour lister les infirmiers avec leurs identifiants
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Crypto.php';

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

try {
    $config = require __DIR__ . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    $crypto = new Crypto();
    
    $stmt = $pdo->prepare('SELECT id, role, email_encrypted, email_dek, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM profiles WHERE role = "nurse"');
    $stmt->execute();
    $nurses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($nurses)) {
        echo "❌ Aucun infirmier trouvé dans la base de données.\n";
        echo "💡 Vous pouvez en créer un avec: php create-nurse.php\n";
    } else {
        echo "📋 Infirmiers trouvés :\n\n";
        foreach ($nurses as $nurse) {
            $email = $crypto->decryptField($nurse['email_encrypted'], $nurse['email_dek']);
            $firstName = $crypto->decryptField($nurse['first_name_encrypted'], $nurse['first_name_dek']);
            $lastName = $crypto->decryptField($nurse['last_name_encrypted'], $nurse['last_name_dek']);
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            echo "📧 Email: $email\n";
            echo "👤 Nom: $firstName $lastName\n";
            echo "🆔 ID: {$nurse['id']}\n";
            echo "\n";
        }
        echo "💡 Pour vous connecter, utilisez l'email ci-dessus.\n";
        echo "   Le système enverra un code OTP à cet email.\n";
    }
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}

