<?php

/**
 * Script pour créer un utilisateur admin et générer un token JWT
 * Usage: php create-admin-token.php
 */

// Charger l'autoloader Composer
require_once __DIR__ . '/../vendor/autoload.php';

require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Crypto.php';
require_once __DIR__ . '/config/database.php';

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

try {
    $auth = new Auth();
    $crypto = new Crypto();
    
    // Configuration DB
    $config = require __DIR__ . '/config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'], $config['port'], $config['database'], $config['charset']);
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    
    $email = 'admin@test.com';
    $emailHash = hash('sha256', strtolower($email));
    
    // Chercher l'utilisateur
    $stmt = $db->prepare('SELECT id, role FROM profiles WHERE email_hash = ?');
    $stmt->execute([$emailHash]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Créer un admin avec chiffrement
        // Générer un UUID v4
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant
        $userId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        
        // Chiffrer les champs avec encryptField
        $emailData = $crypto->encryptField($email);
        $firstNameData = $crypto->encryptField('Admin');
        $lastNameData = $crypto->encryptField('Test');
        
        // Insérer le profil
        $stmt = $db->prepare('INSERT INTO profiles (
            id, role, email_encrypted, email_dek, email_hash,
            first_name_encrypted, first_name_dek,
            last_name_encrypted, last_name_dek,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
        
        $stmt->execute([
            $userId,
            'super_admin',
            $emailData['encrypted'],
            $emailData['dek'],
            $emailHash,
            $firstNameData['encrypted'],
            $firstNameData['dek'],
            $lastNameData['encrypted'],
            $lastNameData['dek']
        ]);
        
        $role = 'super_admin';
        echo "✅ Utilisateur admin créé: $userId\n";
    } else {
        $userId = $user['id'];
        $role = $user['role'] ?: 'super_admin';
        
        // Mettre à jour le rôle si nécessaire
        if ($role !== 'super_admin') {
            $stmt = $db->prepare('UPDATE profiles SET role = ? WHERE id = ?');
            $stmt->execute(['super_admin', $userId]);
            $role = 'super_admin';
        }
        
        echo "✅ Utilisateur admin existant: $userId\n";
    }
    
    // Générer le token
    $token = $auth->generateJWT($userId, $role);
    
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user_id' => $userId,
        'role' => $role
    ], JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT) . "\n";
    exit(1);
}

