<?php

/**
 * Script pour inspecter les sessions OTP dans la base de données
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Auth.php';

$email = 'joopixstudio@gmail.com';
$emailHash = hash('sha256', strtolower($email));

echo "=== INSPECTION OTP ===\n\n";
echo "Email: $email\n";
echo "Email Hash: $emailHash\n\n";

$config = require __DIR__ . '/config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

// 1. Trouver l'utilisateur
echo "1. UTILISATEUR:\n";
$stmt = $db->prepare('SELECT id, email_hash, role, banned_until, created_at FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "   ❌ Utilisateur non trouvé!\n\n";
    exit(1);
}

echo "   ✓ ID: {$user['id']}\n";
echo "   ✓ Role: {$user['role']}\n";
echo "   ✓ Créé le: {$user['created_at']}\n\n";

$userId = $user['id'];

// 2. Vérifier les sessions OTP
echo "2. SESSIONS OTP:\n";
$stmt = $db->prepare('
    SELECT 
        id,
        user_id,
        expires_at,
        verified,
        created_at,
        TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_until_expiry
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
    foreach ($sessions as $i => $session) {
        $expired = $session['seconds_until_expiry'] < 0;
        $status = $expired ? 'EXPIRÉ' : ($session['verified'] ? 'DÉJÀ VÉRIFIÉE' : 'VALIDE');
        $color = $expired ? '🔴' : ($session['verified'] ? '🟡' : '🟢');
        
        echo "   Session " . ($i + 1) . " ($color $status):\n";
        echo "   - ID: {$session['id']}\n";
        echo "   - Créée: {$session['created_at']}\n";
        echo "   - Expire: {$session['expires_at']}\n";
        echo "   - Temps restant: {$session['seconds_until_expiry']} secondes\n";
        echo "   - Vérifiée: " . ($session['verified'] ? 'OUI' : 'NON') . "\n";
        echo "\n";
    }
}

// 3. Vérifier les sessions valides non vérifiées
echo "3. SESSIONS VALIDES NON VÉRIFIÉES:\n";
$stmt = $db->prepare('
    SELECT 
        id,
        user_id,
        expires_at,
        verified,
        created_at,
        TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_until_expiry
    FROM otp_sessions
    WHERE user_id = ? 
      AND verified = FALSE 
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 5
');
$stmt->execute([$userId]);
$validSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($validSessions)) {
    echo "   ⚠️  Aucune session valide non vérifiée trouvée!\n";
    echo "   Cela signifie que toutes les sessions sont soit expirées, soit déjà vérifiées.\n\n";
} else {
    echo "   ✓ " . count($validSessions) . " session(s) valide(s) non vérifiée(s):\n\n";
    foreach ($validSessions as $i => $session) {
        echo "   Session " . ($i + 1) . ":\n";
        echo "   - ID: {$session['id']}\n";
        echo "   - Créée: {$session['created_at']}\n";
        echo "   - Expire dans: {$session['seconds_until_expiry']} secondes\n";
        echo "\n";
    }
}

// 4. Test de création d'un nouveau OTP
echo "4. TEST CRÉATION NOUVEAU OTP:\n";
try {
    $auth = new Auth();
    $result = $auth->requestOTP($email);
    echo "   ✓ OTP créé avec succès\n";
    echo "   - Session ID: {$result['session_id']}\n";
    echo "   - User ID: {$result['user_id']}\n";
    echo "   - Code OTP: {$result['otp']}\n\n";
    
    // Vérifier que la session a été créée
    $stmt = $db->prepare('
        SELECT 
            id,
            expires_at,
            verified,
            TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_until_expiry
        FROM otp_sessions
        WHERE user_id = ? 
          AND verified = FALSE
        ORDER BY created_at DESC
        LIMIT 1
    ');
    $stmt->execute([$result['user_id']]);
    $newSession = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($newSession) {
        echo "   ✓ Session créée dans la BDD:\n";
        echo "   - ID: {$newSession['id']}\n";
        echo "   - Expire dans: {$newSession['seconds_until_expiry']} secondes\n";
        echo "   - Vérifiée: " . ($newSession['verified'] ? 'OUI' : 'NON') . "\n\n";
        
        // Test de vérification
        echo "5. TEST VÉRIFICATION OTP:\n";
        try {
            $verifyResult = $auth->verifyOTP($result['session_id'], $result['otp'], $result['user_id']);
            echo "   ✅ OTP vérifié avec succès!\n";
            echo "   - Token: " . substr($verifyResult['token'], 0, 50) . "...\n";
            echo "   - User ID: {$verifyResult['user']['id']}\n";
            echo "   - Role: {$verifyResult['user']['role']}\n";
        } catch (Exception $e) {
            echo "   ❌ Erreur lors de la vérification: " . $e->getMessage() . "\n";
            echo "   Code OTP utilisé: {$result['otp']}\n";
            echo "   User ID: {$result['user_id']}\n";
        }
    } else {
        echo "   ❌ Session non trouvée dans la BDD après création!\n";
    }
    
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n=== FIN ===\n";




