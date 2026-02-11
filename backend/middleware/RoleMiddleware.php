<?php

/**
 * Middleware de vérification des rôles
 */

class RoleMiddleware
{
    /**
     * Vérifie que l'utilisateur a l'un des rôles autorisés
     */
    public function handle(array $user, array $allowedRoles): void
    {
        if (!in_array($user['role'], $allowedRoles, true)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Accès refusé : rôle insuffisant',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
    }
}




