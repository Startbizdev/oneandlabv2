<?php

/**
 * Script pour récupérer le dernier code OTP créé (pour tests uniquement)
 * ATTENTION: À utiliser uniquement en développement!
 */

// Charger .env
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

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Auth.php';

$email = 'infirmier@oneandlab.fr';
$emailHash = hash('sha256', strtolower($email));

echo "=== RÉCUPÉRATION DU DERNIER CODE OTP ===\n\n";
echo "Email: $email\n\n";

try {
    // Créer un nouveau OTP pour obtenir le code
    $auth = new Auth();
    $result = $auth->requestOTP($email);
    
    echo "✅ Nouveau code OTP généré:\n";
    echo "   Session ID: {$result['session_id']}\n";
    echo "   User ID: {$result['user_id']}\n";
    echo "   Code OTP: {$result['otp']}\n\n";
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📝 INFORMATIONS POUR LA CONNEXION\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    echo "1. Allez sur http://localhost:3000/login\n";
    echo "2. Entrez l'email: $email\n";
    echo "3. Entrez le code OTP: {$result['otp']}\n";
    echo "4. Le code est valide pendant 5 minutes\n\n";
    echo "⚠️  Ne pas utiliser ce code pour tester la vérification ici,\n";
    echo "   sinon il sera invalidé avant que vous puissiez l'utiliser.\n";
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}



