<?php

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/ApiServerError.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Middleware d'authentification
 * Vérifie la présence et validité du token JWT
 */

class AuthMiddleware
{
    private Auth $auth;
    private User $user;

    public function __construct()
    {
        $this->auth = new Auth();
        $this->user = new User();
    }

    /**
     * Vérifie l'authentification et retourne les infos utilisateur
     */
    public function handle(): array
    {
        $authHeader = self::authorizationHeader();
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Token d\'authentification manquant',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }
        
        $token = self::bearerToken($authHeader);
        if ($token === null) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Format de token invalide',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }
        
        $userId = $this->userIdFromToken($token);
        if ($userId === null) {
            $this->respondInvalidToken();
        }

        // Une panne base de données ne doit pas répondre 401 : les clients déconnecteraient l'utilisateur.
        try {
            // Toujours utiliser le rôle en base : le JWT est émis à la connexion et peut être obsolète
            // si le profil a changé (ex. infirmier → laboratoire), ce qui provoquait des refus d’acceptation RDV incohérents avec l’UI.
            $role = $this->user->getRoleById($userId);
            $banned = $role !== null && $this->user->isBanned($userId);
        } catch (Throwable $e) {
            ApiServerError::respond('authentification user=' . $userId, $e);
            exit;
        }

        if ($role === null) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Utilisateur introuvable',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }

        if ($banned) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Ce compte est suspendu',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }

        return [
            'user_id' => $userId,
            'role' => $role,
        ];
    }

    /**
     * Authentification facultative (endpoints publics) : l'utilisateur si la session est valide,
     * null sinon (pas de token, token invalide ou expiré, compte introuvable ou suspendu).
     *
     * @return array{user_id: string, role: string}|null
     */
    public function tryAuthenticate(): ?array
    {
        $authHeader = self::authorizationHeader();
        $token = $authHeader !== null ? self::bearerToken($authHeader) : null;
        $userId = $token !== null ? $this->userIdFromToken($token) : null;
        if ($userId === null) {
            return null;
        }

        $role = $this->user->getRoleById($userId);
        if ($role === null || $this->user->isBanned($userId)) {
            return null;
        }

        return [
            'user_id' => $userId,
            'role' => $role,
        ];
    }

    private function userIdFromToken(string $token): ?string
    {
        try {
            $decoded = $this->auth->verifyJWT($token);
        } catch (UnexpectedValueException $e) {
            ApiServerError::log('JWT rejeté', $e);
            return null;
        }
        $userId = $decoded['user_id'] ?? null;

        return is_string($userId) && $userId !== '' ? $userId : null;
    }

    public static function authorizationHeader(): ?string
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $value = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    private static function bearerToken(string $authHeader): ?string
    {
        // Format attendu : "Bearer {token}"
        return preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches) ? $matches[1] : null;
    }

    private function respondInvalidToken(): never
    {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token invalide',
            'code' => 'UNAUTHORIZED',
        ]);
        exit;
    }
}
