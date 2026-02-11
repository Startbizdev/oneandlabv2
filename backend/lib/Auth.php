<?php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Validation.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/../models/User.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Classe de gestion de l'authentification
 * OTP par email + JWT
 */

class Auth
{
    private PDO $db;
    private Logger $logger;
    private string $jwtSecret;
    private int $jwtExpiration = 7 * 24 * 60 * 60; // 7 jours en secondes
    private int $otpExpiration = 5 * 60; // 5 minutes en secondes

    public function __construct()
    {
        $config = require __DIR__ . '/../config/database.php';

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        $this->logger = new Logger();

        $this->jwtSecret = $_ENV['JWT_SECRET'] ?? '';
        if (empty($this->jwtSecret)) {
            throw new Exception('JWT_SECRET non configuré');
        }
    }

    /**
     * Génère un code OTP à 6 chiffres
     */
    public function generateOTP(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Crée une session OTP et envoie le code par email
     */
    /**
     * Vérifie si un utilisateur existe par email (sans créer de compte)
     */
    public function checkEmail(string $email): array
    {
        if (!Validation::email($email)) {
            throw new Exception('Email invalide');
        }

        $emailHash = hash('sha256', strtolower($email));
        $userModel = new User();
        $existingUser = $userModel->findByEmailHash($emailHash);

        if (!$existingUser) {
            return ['exists' => false];
        }

        // Vérifier si le compte est banni
        if ($userModel->isBanned($existingUser['id'])) {
            $stmt = $this->db->prepare('SELECT banned_until FROM profiles WHERE id = ?');
            $stmt->execute([$existingUser['id']]);
            $profile = $stmt->fetch();
            $bannedUntil = new DateTime($profile['banned_until']);
            throw new Exception('Ce compte est suspendu jusqu\'au ' . $bannedUntil->format('d/m/Y H:i'));
        }

        return ['exists' => true, 'role' => $existingUser['role']];
    }

    /**
     * Crée une session OTP et envoie le code par email
     * @param bool $autoCreate Si true, crée le compte patient automatiquement (utilisé par guest-to-user)
     */
    public function requestOTP(string $email, bool $autoCreate = false): array
    {
        if (!Validation::email($email)) {
            throw new Exception('Email invalide');
        }

        // Générer le code OTP
        $otp = $this->generateOTP();
        $otpHash = password_hash($otp, PASSWORD_BCRYPT);

        // Générer un session ID
        $sessionId = bin2hex(random_bytes(16));

        // Trouver l'utilisateur par email_hash
        $emailHash = hash('sha256', strtolower($email));
        $userModel = new User();
        $existingUser = $userModel->findByEmailHash($emailHash);

        if (!$existingUser) {
            if (!$autoCreate) {
                throw new Exception('Aucun compte trouvé avec cet email');
            }
            // Créer un nouvel utilisateur (patient par défaut) — uniquement pour le flow guest-to-user
            $userId = $userModel->create([
                'email' => $email,
                'first_name' => '',
                'last_name' => '',
                'phone' => null,
                'role' => 'patient',
            ], 'system', 'system');
        } else {
            $userId = $existingUser['id'];

            // Vérifier si le compte est banni
            if ($userModel->isBanned($userId)) {
                $stmt = $this->db->prepare('SELECT banned_until FROM profiles WHERE id = ?');
                $stmt->execute([$userId]);
                $profile = $stmt->fetch();
                $bannedUntil = new DateTime($profile['banned_until']);
                throw new Exception('Ce compte est suspendu jusqu\'au ' . $bannedUntil->format('d/m/Y H:i'));
            }
        }
        
        // Invalider toutes les sessions OTP précédentes non vérifiées pour cet utilisateur
        // pour éviter la confusion avec plusieurs codes actifs
        $invalidateStmt = $this->db->prepare('
            UPDATE otp_sessions 
            SET verified = TRUE 
            WHERE user_id = ? AND verified = FALSE
        ');
        $invalidateStmt->execute([$userId]);
        
        // Stocker la session OTP - utiliser NOW() de MySQL pour éviter les problèmes de fuseau horaire
        // expires_at sera calculé par MySQL avec DATE_ADD pour être cohérent avec NOW()
        $stmt = $this->db->prepare('
            INSERT INTO otp_sessions (user_id, otp_hash, expires_at, created_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NOW())
        ');
        $stmt->execute([$userId, $otpHash, $this->otpExpiration]);
        
        // Retourner l'OTP pour qu'il puisse être envoyé par email (sera retiré de la réponse finale pour sécurité)
        return [
            'success' => true,
            'session_id' => $sessionId,
            'user_id' => $userId,
            'otp' => $otp, // Retourner l'OTP pour envoi par email
        ];
    }

    /**
     * Vérifie le code OTP et génère un token JWT
     */
    public function verifyOTP(string $sessionId, string $otp, ?string $userId = null): array
    {
        if (!Validation::otp($otp)) {
            throw new Exception('Code OTP invalide (6 chiffres requis)');
        }

        // Trouver la session OTP
        if ($userId) {
            $stmt = $this->db->prepare('
                SELECT id, user_id, otp_hash, expires_at, verified
                FROM otp_sessions
                WHERE user_id = ? AND verified = FALSE AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $stmt->execute([$userId]);
        } else {
            throw new Exception('user_id requis pour vérification OTP');
        }
        
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$session) {
            // Vérifier s'il y a des sessions expirées ou déjà vérifiées
            $checkStmt = $this->db->prepare('
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified_count,
                    SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired_count
                FROM otp_sessions
                WHERE user_id = ?
            ');
            $checkStmt->execute([$userId]);
            $stats = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            // Logger l'échec d'authentification (HDS)
            $this->logger->log(
                null,
                null,
                'login_failed',
                'auth',
                null,
                [
                    'reason' => 'session_not_found_or_expired',
                    'user_id' => $userId,
                    'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
                ]
            );
            
            $message = 'Session OTP introuvable ou expirée. Veuillez demander un nouveau code.';
            if ($stats && $stats['expired_count'] > 0) {
                $message .= ' (Le code a expiré)';
            } elseif ($stats && $stats['verified_count'] > 0) {
                $message .= ' (Le code a déjà été utilisé)';
            }
            
            throw new Exception($message);
        }

        if ($session['verified']) {
            // Logger l'échec d'authentification (HDS)
            $this->logger->log(
                $session['user_id'],
                null,
                'login_failed',
                'auth',
                null,
                [
                    'reason' => 'otp_already_used',
                    'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
                ]
            );
            throw new Exception('Code OTP déjà utilisé');
        }

        // Vérifier le code
        // S'assurer que l'OTP est une string
        $otpString = (string)$otp;
        
        // Vérifier que l'OTP ne contient que des chiffres
        if (!preg_match('/^\d{6}$/', $otpString)) {
            throw new Exception('Code OTP invalide (format incorrect)');
        }
        
        $verifyResult = password_verify($otpString, $session['otp_hash']);
        
        if (!$verifyResult) {
            // Vérifier s'il y a d'autres sessions récentes avec un code différent
            $otherStmt = $this->db->prepare('
                SELECT COUNT(*) as count
                FROM otp_sessions
                WHERE user_id = ? 
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                  AND id != ?
            ');
            $otherStmt->execute([$userId, $session['id']]);
            $otherSessions = $otherStmt->fetch(PDO::FETCH_ASSOC);
            
            // Logger l'échec d'authentification (HDS)
            $this->logger->log(
                $session['user_id'],
                null,
                'login_failed',
                'auth',
                null,
                [
                    'reason' => 'invalid_otp',
                    'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
                ]
            );
            
            $errorMessage = 'Code OTP incorrect';
            if ($otherSessions && $otherSessions['count'] > 0) {
                $errorMessage .= '. Un nouveau code a peut-être été généré. Veuillez utiliser le code le plus récent.';
            } else {
                $errorMessage .= '. Vérifiez le code reçu par email et réessayez.';
            }
            
            throw new Exception($errorMessage);
        }
        
        // Marquer comme vérifié
        $stmt = $this->db->prepare('UPDATE otp_sessions SET verified = TRUE WHERE id = ?');
        $stmt->execute([$session['id']]);
        
        // Récupérer les informations utilisateur
        $stmt = $this->db->prepare('SELECT id, role FROM profiles WHERE id = ?');
        $stmt->execute([$session['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            throw new Exception('Utilisateur introuvable');
        }
        
        // Générer le token JWT
        $token = $this->generateJWT($user['id'], $user['role']);

        // Logger l'authentification réussie (HDS obligatoire)
        $this->logger->log(
            $user['id'],
            $user['role'],
            'login',
            'auth',
            null,
            [
                'method' => 'otp',
                'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]
        );

        // Créer une notification de bienvenue si c'est la première connexion
        try {
            require_once __DIR__ . '/../models/Notification.php';
            $notificationModel = new Notification();
            
            if (!$notificationModel->hasWelcomeNotification($user['id'])) {
                $notificationModel->createWelcomeNotification($user['id'], $user['role']);
            }
        } catch (Exception $e) {
            // Ne pas bloquer l'authentification si la notification échoue
            error_log('Erreur lors de la création de la notification de bienvenue: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'role' => $user['role'],
            ],
        ];
    }

    /**
     * Génère un token JWT
     */
    public function generateJWT(string $userId, string $role): string
    {
        $now = time();
        
        $payload = [
            'user_id' => $userId,
            'role' => $role,
            'iat' => $now,
            'exp' => $now + $this->jwtExpiration,
        ];
        
        return JWT::encode($payload, $this->jwtSecret, 'HS256');
    }

    /**
     * Vérifie et décode un token JWT
     */
    public function verifyJWT(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
            return (array) $decoded;
        } catch (Exception $e) {
            throw new Exception('Token JWT invalide: ' . $e->getMessage());
        }
    }

    /**
     * Génère un UUID v4
     */
    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant
        
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

