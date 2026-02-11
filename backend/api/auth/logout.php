<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification (optionnelle pour logout, mais recommandée pour logging)
$user = null;
try {
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();

    // Logger la déconnexion (HDS)
    require_once __DIR__ . '/../../lib/Logger.php';
    $logger = new Logger();
    $logger->log(
        $user['user_id'],
        $user['role'],
        'logout',
        'auth',
        null,
        [
            'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );
} catch (Exception $e) {
    // Si le token est invalide, logger quand même la tentative de déconnexion
    require_once __DIR__ . '/../../lib/Logger.php';
    $logger = new Logger();
    $logger->log(
        null,
        null,
        'logout_attempt',
        'auth',
        null,
        [
            'reason' => 'invalid_token',
            'ip_address' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );
    // On accepte quand même le logout (l'utilisateur veut se déconnecter)
}

// Avec JWT stateless, le logout côté serveur consiste principalement à :
// 1. Retourner un succès (le token sera supprimé côté client)
// 2. Optionnellement, logger la déconnexion

// Note: Pour une invalidation côté serveur, il faudrait implémenter une blacklist de tokens
// stockée en base de données, ce qui sort du scope MVP. Le token expire naturellement après 7 jours.

echo json_encode([
    'success' => true,
    'message' => 'Déconnexion réussie',
]);

