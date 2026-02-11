<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/Email.php';
require_once __DIR__ . '/../../../lib/Crypto.php';

// CORS
$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification + Vérification rôle admin
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$logger = new Logger();
$email = new Email();
$crypto = new Crypto();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['action'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'action requis (suspend, ban, unban)']);
        exit;
    }
    
    $action = $input['action'];
    $days = $input['days'] ?? 7;
    $reason = $input['reason'] ?? 'Sanction administrative';
    
    try {
        // Récupérer l'email de l'utilisateur pour les notifications
        $stmt = $db->prepare('SELECT email_encrypted, email_dek FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $userEmail = null;
        if ($profile && !empty($profile['email_encrypted']) && !empty($profile['email_dek'])) {
            try {
                $userEmail = $crypto->decryptField($profile['email_encrypted'], $profile['email_dek']);
            } catch (Exception $e) {
                // Erreur de déchiffrement - continuer sans email
            }
        }
        
        $bannedUntil = null;
        
        switch ($action) {
            case 'suspend':
                // Suspension temporaire
                $bannedUntil = date('Y-m-d H:i:s', strtotime("+{$days} days"));
                $stmt = $db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
                $stmt->execute([$bannedUntil, $id]);
                
                // Email de suspension
                if ($userEmail) {
                    try {
                        $email->sendSuspensionEmail($userEmail, $days, $reason);
                    } catch (Exception $e) {
                        // Erreur d'envoi email - continuer sans bloquer
                    }
                }
                
                // Logger
                $logger->log(
                    $user['user_id'],
                    $user['role'],
                    'suspend_user',
                    'profile',
                    $id,
                    ['days' => $days, 'reason' => $reason, 'banned_until' => $bannedUntil]
                );
                break;
                
            case 'ban':
                // Bannissement définitif
                $bannedUntil = '9999-12-31 23:59:59';
                $stmt = $db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
                $stmt->execute([$bannedUntil, $id]);
                
                // Email de bannissement
                if ($userEmail) {
                    try {
                        $email->sendBanEmail($userEmail, $reason);
                    } catch (Exception $e) {
                        // Erreur d'envoi email - continuer sans bloquer
                    }
                }
                
                // Logger
                $logger->log(
                    $user['user_id'],
                    $user['role'],
                    'ban_user',
                    'profile',
                    $id,
                    ['reason' => $reason]
                );
                break;
                
            case 'unban':
                // Débannir
                $stmt = $db->prepare('UPDATE profiles SET banned_until = NULL WHERE id = ?');
                $stmt->execute([$id]);
                
                // Logger
                $logger->log(
                    $user['user_id'],
                    $user['role'],
                    'unban_user',
                    'profile',
                    $id,
                    []
                );
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Action invalide']);
                exit;
        }
        
        // Récupérer les infos mises à jour
        $stmt = $db->prepare('SELECT incident_count, banned_until, last_incident_at FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $updatedProfile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'banned_until' => $updatedProfile['banned_until'],
                'incident_count' => $updatedProfile['incident_count'],
            ],
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

