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

        return ['exists' => true, 'role' => $existingUser['role'], 'has_password' => $this->userHasPassword($existingUser['id'])];
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
        return $this->finishLogin($user['id'], $user['role'], 'otp');
    }

    /**
     * Connexion par email + mot de passe.
     */
    public function loginWithPassword(string $email, string $password): array
    {
        if (!Validation::email($email)) {
            throw new Exception('Email invalide');
        }

        $emailHash = hash('sha256', strtolower($email));
        $userModel = new User();
        $existingUser = $userModel->findByEmailHash($emailHash);

        if (!$existingUser) {
            $this->logLoginFailed(null, 'password_user_not_found');
            throw new Exception('Email ou mot de passe incorrect');
        }

        $userId = $existingUser['id'];

        if ($userModel->isBanned($userId)) {
            $stmt = $this->db->prepare('SELECT banned_until FROM profiles WHERE id = ?');
            $stmt->execute([$userId]);
            $profile = $stmt->fetch();
            $bannedUntil = new DateTime($profile['banned_until']);
            throw new Exception('Ce compte est suspendu jusqu\'au ' . $bannedUntil->format('d/m/Y H:i'));
        }

        if (!$this->userHasPassword($userId)) {
            $this->logLoginFailed($userId, 'password_not_set');
            throw new Exception('Aucun mot de passe sur ce compte. Utilisez le code par email ou créez-en un depuis votre profil.');
        }

        $stmt = $this->db->prepare('SELECT password_hash FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $hash = $row['password_hash'] ?? null;

        if (!$hash || !password_verify($password, $hash)) {
            $this->logLoginFailed($userId, 'invalid_password');
            throw new Exception('Email ou mot de passe incorrect');
        }

        $stmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new Exception('Utilisateur introuvable');
        }

        return $this->finishLogin($userId, $user['role'], 'password');
    }

    /**
     * Crée ou met à jour le mot de passe (utilisateur connecté).
     */
    public function updatePassword(string $userId, ?string $currentPassword, string $newPassword, ?string $emailForValidation = null): array
    {
        $validation = Validation::password($newPassword, $emailForValidation);
        if (!$validation['valid']) {
            throw new Exception($validation['error'] ?? 'Mot de passe invalide');
        }

        $hasPassword = $this->userHasPassword($userId);

        if ($hasPassword) {
            if ($currentPassword === null || $currentPassword === '') {
                throw new Exception('Mot de passe actuel requis');
            }
            $stmt = $this->db->prepare('SELECT password_hash FROM profiles WHERE id = ?');
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
                throw new Exception('Mot de passe actuel incorrect');
            }
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare('
            UPDATE profiles
            SET password_hash = ?, password_set_at = NOW(), must_change_password = 0, updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$newHash, $userId]);

        $this->logger->log(
            $userId,
            null,
            $hasPassword ? 'password_changed' : 'password_set',
            'auth',
            null,
            ['ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null]
        );

        return ['success' => true, 'has_password' => true, 'must_change_password' => false];
    }

    /**
     * Demande de réinitialisation (self-service ou admin) — réponse générique côté API.
     * @return array{sent: bool, token?: string, code?: string, user_id?: string}
     */
    public function createPasswordReset(string $email, string $createdBy = 'self'): array
    {
        if (!Validation::email($email)) {
            return ['sent' => false];
        }

        $emailHash = hash('sha256', strtolower($email));
        $userModel = new User();
        $existingUser = $userModel->findByEmailHash($emailHash);
        if (!$existingUser) {
            return ['sent' => false];
        }

        $userId = $existingUser['id'];
        if ($userModel->isBanned($userId)) {
            return ['sent' => false];
        }

        if (!$this->hasPasswordResetTable()) {
            throw new Exception('Réinitialisation mot de passe indisponible');
        }

        $plainToken = bin2hex(random_bytes(32));
        $tokenHash = password_hash($plainToken, PASSWORD_BCRYPT);
        $code = $this->generateOTP();
        $codeHash = password_hash($code, PASSWORD_BCRYPT);
        $resetId = $this->generateUUID();

        $stmt = $this->db->prepare('
            UPDATE password_reset_tokens SET used_at = NOW()
            WHERE user_id = ? AND used_at IS NULL
        ');
        $stmt->execute([$userId]);

        $stmt = $this->db->prepare('
            INSERT INTO password_reset_tokens (id, user_id, token_hash, code_hash, expires_at, created_by, created_at)
            VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE), ?, NOW())
        ');
        $stmt->execute([$resetId, $userId, $tokenHash, $codeHash, $createdBy]);

        $this->logger->log(
            $userId,
            null,
            'password_reset_requested',
            'auth',
            null,
            ['created_by' => $createdBy, 'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null]
        );

        return [
            'sent' => true,
            'user_id' => $userId,
            'token' => $plainToken,
            'code' => $code,
        ];
    }

    /**
     * Réinitialise le mot de passe via token lien ou code 6 chiffres.
     */
    public function resetPasswordWithTokenOrCode(string $newPassword, ?string $token = null, ?string $code = null, ?string $email = null): array
    {
        $validation = Validation::password($newPassword, $email);
        if (!$validation['valid']) {
            throw new Exception($validation['error'] ?? 'Mot de passe invalide');
        }

        if (!$this->hasPasswordResetTable()) {
            throw new Exception('Réinitialisation indisponible');
        }

        $resetRow = null;
        if ($token !== null && $token !== '') {
            $stmt = $this->db->prepare('
                SELECT prt.*, p.email_hash
                FROM password_reset_tokens prt
                INNER JOIN profiles p ON p.id = prt.user_id
                WHERE prt.used_at IS NULL AND prt.expires_at > NOW()
                ORDER BY prt.created_at DESC
                LIMIT 50
            ');
            $stmt->execute();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if (password_verify($token, $row['token_hash'])) {
                    $resetRow = $row;
                    break;
                }
            }
        } elseif ($code !== null && $email !== null && Validation::otp($code) && Validation::email($email)) {
            $emailHash = hash('sha256', strtolower($email));
            $userModel = new User();
            $existingUser = $userModel->findByEmailHash($emailHash);
            if (!$existingUser) {
                throw new Exception('Code ou email invalide');
            }
            $stmt = $this->db->prepare('
                SELECT * FROM password_reset_tokens
                WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW() AND code_hash IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $stmt->execute([$existingUser['id']]);
            $resetRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$resetRow || !password_verify($code, $resetRow['code_hash'])) {
                throw new Exception('Code ou email invalide');
            }
        } else {
            throw new Exception('Token ou code requis');
        }

        if (!$resetRow) {
            throw new Exception('Lien ou code expiré. Demandez une nouvelle réinitialisation.');
        }

        $userId = $resetRow['user_id'];
        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare('
            UPDATE profiles
            SET password_hash = ?, password_set_at = NOW(), must_change_password = 0, updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$newHash, $userId]);

        $stmt = $this->db->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?');
        $stmt->execute([$resetRow['id']]);

        $this->logger->log($userId, null, 'password_reset_completed', 'auth', null, []);

        return ['success' => true];
    }

    /**
     * Mot de passe temporaire admin — changement forcé à la prochaine connexion.
     */
    public function adminSetTemporaryPassword(string $userId, string $plainPassword): void
    {
        $validation = Validation::password($plainPassword);
        if (!$validation['valid']) {
            throw new Exception($validation['error'] ?? 'Mot de passe invalide');
        }

        $newHash = password_hash($plainPassword, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare('
            UPDATE profiles
            SET password_hash = ?, password_set_at = NOW(), must_change_password = 1, updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$newHash, $userId]);

        $this->logger->log($userId, null, 'admin_temp_password', 'auth', null, []);
    }

    public function userHasPassword(string $userId): bool
    {
        if (!$this->hasPasswordColumn()) {
            return false;
        }
        $stmt = $this->db->prepare('SELECT password_hash FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return !empty($row['password_hash']);
    }

    public function getPasswordFlags(string $userId): array
    {
        if (!$this->hasPasswordColumn()) {
            return ['has_password' => false, 'must_change_password' => false];
        }
        $stmt = $this->db->prepare('SELECT password_hash, must_change_password FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['has_password' => false, 'must_change_password' => false];
        }
        return [
            'has_password' => !empty($row['password_hash']),
            'must_change_password' => (bool) ($row['must_change_password'] ?? false),
        ];
    }

    private function finishLogin(string $userId, string $role, string $method): array
    {
        $token = $this->generateJWT($userId, $role);
        $flags = $this->getPasswordFlags($userId);

        $this->logger->log(
            $userId,
            $role,
            'login',
            'auth',
            null,
            [
                'method' => $method,
                'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]
        );

        try {
            require_once __DIR__ . '/../models/Notification.php';
            $notificationModel = new Notification();
            if (!$notificationModel->hasWelcomeNotification($userId)) {
                $notificationModel->createWelcomeNotification($userId, $role);
            }
        } catch (Exception $e) {
            error_log('Erreur notification bienvenue: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $userId,
                'role' => $role,
                'has_password' => $flags['has_password'],
                'must_change_password' => $flags['must_change_password'],
            ],
            'must_change_password' => $flags['must_change_password'],
        ];
    }

    private function logLoginFailed(?string $userId, string $reason): void
    {
        $this->logger->log(
            $userId,
            null,
            'login_failed',
            'auth',
            null,
            [
                'reason' => $reason,
                'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]
        );
    }

    private function hasPasswordColumn(): bool
    {
        static $has = null;
        if ($has === null) {
            $stmt = $this->db->query("SHOW COLUMNS FROM profiles LIKE 'password_hash'");
            $has = $stmt && $stmt->rowCount() > 0;
        }
        return $has;
    }

    private function hasPasswordResetTable(): bool
    {
        static $has = null;
        if ($has === null) {
            $stmt = $this->db->query("SHOW TABLES LIKE 'password_reset_tokens'");
            $has = $stmt && $stmt->rowCount() > 0;
        }
        return $has;
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

