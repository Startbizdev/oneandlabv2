<?php

/**
 * Script pour corriger l'utilisateur infirmier@oneandlab.fr
 * Supprime et recrée l'utilisateur avec la KEK actuelle
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

require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/config/database.php';

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

$email = 'infirmier@oneandlab.fr';
$emailHash = hash('sha256', strtolower($email));

echo "=== CORRECTION UTILISATEUR INFIRMIER ===\n\n";
echo "Email: $email\n\n";

// Vérifier si l'utilisateur existe
$stmt = $pdo->prepare('SELECT id FROM profiles WHERE email_hash = ?');
$stmt->execute([$emailHash]);
$existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingUser) {
    $userId = $existingUser['id'];
    echo "⚠️  Utilisateur trouvé: $userId\n";
    echo "   Suppression de l'ancien utilisateur...\n";
    
    // Supprimer les sessions OTP
    $pdo->prepare('DELETE FROM otp_sessions WHERE user_id = ?')->execute([$userId]);
    
    // Supprimer l'utilisateur
    $pdo->prepare('DELETE FROM profiles WHERE id = ?')->execute([$userId]);
    
    echo "   ✓ Ancien utilisateur supprimé\n\n";
}

// Recréer l'utilisateur avec la KEK actuelle
echo "📝 Création du nouvel utilisateur...\n";

$id = bin2hex(random_bytes(16));
$uuid = sprintf(
    '%08s-%04s-%04s-%04s-%012s',
    substr($id, 0, 8),
    substr($id, 8, 4),
    substr($id, 12, 4),
    substr($id, 16, 4),
    substr($id, 20, 12)
);

// Chiffrer les données avec la KEK actuelle
$emailData = $crypto->encryptField($email);
$firstNameData = $crypto->encryptField('Infirmier');
$lastNameData = $crypto->encryptField('Test');
$phoneData = $crypto->encryptField('0612345682');

// Insérer le nouvel utilisateur
$sql = "INSERT INTO profiles (
    id, role,
    email_encrypted, email_dek, email_hash,
    first_name_encrypted, first_name_dek,
    last_name_encrypted, last_name_dek,
    phone_encrypted, phone_dek,
    created_at
) VALUES (
    :id, 'nurse',
    :email_encrypted, :email_dek, :email_hash,
    :first_name_encrypted, :first_name_dek,
    :last_name_encrypted, :last_name_dek,
    :phone_encrypted, :phone_dek,
    NOW()
)";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':id' => $uuid,
    ':email_encrypted' => $emailData['encrypted'],
    ':email_dek' => $emailData['dek'],
    ':email_hash' => $emailHash,
    ':first_name_encrypted' => $firstNameData['encrypted'],
    ':first_name_dek' => $firstNameData['dek'],
    ':last_name_encrypted' => $lastNameData['encrypted'],
    ':last_name_dek' => $lastNameData['dek'],
    ':phone_encrypted' => $phoneData['encrypted'],
    ':phone_dek' => $phoneData['dek'],
]);

echo "✅ Utilisateur recréé avec succès!\n";
echo "   ID: $uuid\n";
echo "   Email: $email\n";
echo "   Rôle: nurse\n\n";
echo "💡 Vous pouvez maintenant vous reconnecter avec cet email.\n";


