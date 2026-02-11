<?php

/**
 * Middleware CSRF
 * Vérifie la présence et validité du token CSRF pour les requêtes modifiantes
 */

class CSRFMiddleware
{
    /**
     * Vérifie le token CSRF pour les requêtes POST/PUT/DELETE
     */
    public static function handle(): void
    {
        // Ne pas vérifier CSRF pour les requêtes GET/OPTIONS
        if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'OPTIONS'], true)) {
            return;
        }

        // Démarrer la session si elle n'est pas déjà démarrée
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Récupérer le token depuis le header
        $headers = getallheaders();
        $csrfToken = $headers['X-CSRF-Token'] ?? $headers['x-csrf-token'] ?? null;

        // Récupérer le token depuis la session
        $sessionToken = $_SESSION['csrf_token'] ?? null;

        // Vérifier la présence du token
        if (!$csrfToken || !$sessionToken) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Token CSRF manquant',
                'code' => 'CSRF_TOKEN_MISSING',
            ]);
            exit;
        }

        // Vérifier que les tokens correspondent
        if (!hash_equals($sessionToken, $csrfToken)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Token CSRF invalide',
                'code' => 'CSRF_TOKEN_INVALID',
            ]);
            exit;
        }
    }

    /**
     * Génère un nouveau token CSRF et le stocke en session
     */
    public static function generateToken(): string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Générer un token aléatoire sécurisé
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;

        return $token;
    }

    /**
     * Récupère le token CSRF actuel (sans en générer un nouveau)
     */
    public static function getToken(): ?string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        return $_SESSION['csrf_token'] ?? null;
    }
}




