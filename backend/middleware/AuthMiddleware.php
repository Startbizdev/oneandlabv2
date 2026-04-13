<?php

require_once __DIR__ . '/../lib/Auth.php';
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
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Token d\'authentification manquant',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }
        
        // Extraire le token (format: "Bearer {token}")
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Format de token invalide',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }
        
        try {
            $decoded = $this->auth->verifyJWT($token);
            $userId = $decoded['user_id'];
            // Toujours utiliser le rôle en base : le JWT est émis à la connexion et peut être obsolète
            // si le profil a changé (ex. infirmier → laboratoire), ce qui provoquait des refus d’acceptation RDV incohérents avec l’UI.
            $role = $this->user->getRoleById($userId);
            if ($role === null) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Utilisateur introuvable',
                    'code' => 'UNAUTHORIZED',
                ]);
                exit;
            }

            // Vérifier si le compte est banni
            if ($this->user->isBanned($userId)) {
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
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Token invalide',
                'code' => 'UNAUTHORIZED',
            ]);
            exit;
        }
    }
}




