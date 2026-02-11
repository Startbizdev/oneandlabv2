<?php

/**
 * Script de débogage pour vérifier un code OTP spécifique
 * Usage: php debug-otp.php <user_id> <otp_code>
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Auth.php';

if ($argc < 3) {
    echo "Usage: php debug-otp.php <user_id> <otp_code>\n";
    exit(1);
}

$userId = $argv[1];
$otpCode = $argv[2];

echo "=== DÉBOGAGE OTP ===\n\n";
echo "User ID: $userId\n";
echo "Code OTP: $otpCode\n";
echo "Longueur: " . strlen($otpCode) . "\n\n";

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

// 1. Vérifier toutes les sessions OTP pour cet utilisateur
echo "1. TOUTES LES SESSIONS OTP:\n";
$stmt = $db->prepare('
    SELECT 
        id,
        user_id,
        otp_hash,
        expires_at,
        verified,
        created_at,
        TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_until_expiry,
        CASE 
            WHEN expires_at < NOW() THEN "EXPIRÉ"
            WHEN verified = TRUE THEN "DÉJÀ VÉRIFIÉE"
            ELSE "VALIDE"
        END AS status
    FROM otp_sessions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
');
$stmt->execute([$userId]);
$sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($sessions)) {
    echo "   ❌ Aucune session OTP trouvée!\n\n";
} else {
    echo "   ✓ " . count($sessions) . " session(s) trouvée(s):\n\n";
    foreach ($sessions as $session) {
        echo "   Session ID: {$session['id']}\n";
        echo "   - Créée le: {$session['created_at']}\n";
        echo "   - Expire le: {$session['expires_at']}\n";
        echo "   - Expire dans: {$session['seconds_until_expiry']} secondes\n";
        echo "   - Statut: {$session['status']}\n";
        echo "   - Vérifiée: " . ($session['verified'] ? 'OUI' : 'NON') . "\n";
        echo "   - Hash: " . substr($session['otp_hash'], 0, 30) . "...\n";
        
        // Tester le code OTP avec ce hash
        $verifyResult = password_verify($otpCode, $session['otp_hash']);
        echo "   - Code OTP '$otpCode' correspond: " . ($verifyResult ? '✅ OUI' : '❌ NON') . "\n";
        echo "\n";
    }
}

// 2. Vérifier les sessions valides (non vérifiées et non expirées)
echo "2. SESSIONS VALIDES (non vérifiées et non expirées):\n";
$stmt = $db->prepare('
    SELECT 
        id,
        user_id,
        otp_hash,
        expires_at,
        verified,
        created_at
    FROM otp_sessions
    WHERE user_id = ? AND verified = FALSE AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
');
$stmt->execute([$userId]);
$validSession = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$validSession) {
    echo "   ❌ Aucune session valide trouvée!\n\n";
} else {
    echo "   ✓ Session valide trouvée:\n";
    echo "   - ID: {$validSession['id']}\n";
    echo "   - Créée le: {$validSession['created_at']}\n";
    echo "   - Expire le: {$validSession['expires_at']}\n";
    echo "   - Hash: " . substr($validSession['otp_hash'], 0, 30) . "...\n";
    
    // Tester le code OTP
    $verifyResult = password_verify($otpCode, $validSession['otp_hash']);
    echo "   - Code OTP '$otpCode' correspond: " . ($verifyResult ? '✅ OUI' : '❌ NON') . "\n";
    
    if (!$verifyResult) {
        echo "\n   ⚠️  Le code OTP ne correspond pas au hash de la session valide!\n";
        echo "   Vérifiez que vous utilisez le code le plus récent.\n";
    }
    echo "\n";
}

// 3. Test avec Auth::verifyOTP
echo "3. TEST AVEC Auth::verifyOTP:\n";
try {
    $auth = new Auth();
    $result = $auth->verifyOTP('', $otpCode, $userId);
    echo "   ✅ Vérification réussie!\n";
    echo "   - Token généré: " . substr($result['token'], 0, 50) . "...\n";
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n=== FIN ===\n";




