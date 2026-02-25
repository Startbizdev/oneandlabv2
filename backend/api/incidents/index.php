<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../lib/EmailQueue.php';
require_once __DIR__ . '/../../lib/Crypto.php';

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

// Authentification + Vérification rôle admin
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware(['super_admin']);
$roleMiddleware->handle($user['role']);

$config = require __DIR__ . '/../../config/database.php';
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['user_id']) || !isset($input['reason'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'user_id et reason requis']);
        exit;
    }
    
    $userId = $input['user_id'];
    $reason = $input['reason'];
    $details = $input['details'] ?? null;
    
    try {
        // Incrémenter incident_count
        $stmt = $db->prepare('
            UPDATE profiles 
            SET 
                incident_count = incident_count + 1,
                last_incident_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([$userId]);
        
        // Récupérer le nouveau count et email
        $stmt = $db->prepare('SELECT incident_count, email_encrypted, email_dek FROM profiles WHERE id = ?');
        $stmt->execute([$userId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $incidentCount = (int) $profile['incident_count'];
        
        // Déchiffrer l'email pour l'envoi
        $patientEmail = null;
        if (!empty($profile['email_encrypted']) && !empty($profile['email_dek'])) {
            try {
                $patientEmail = $crypto->decryptField($profile['email_encrypted'], $profile['email_dek']);
            } catch (Exception $e) {
                // Erreur de déchiffrement - continuer sans email
            }
        }
        
        // Logger l'incident
        $logger->log(
            $userId,
            null,
            'incident',
            'profile',
            $userId,
            [
                'reason' => $reason,
                'incident_count' => $incidentCount,
                'details' => $details,
            ]
        );
        
        // Appliquer les sanctions automatiques
        $bannedUntil = null;
        
        if ($incidentCount === 1) {
            // Email d'avertissement (async)
            if ($patientEmail) {
                EmailQueue::add('incident_warning', $patientEmail, ['count' => $incidentCount, 'reason' => $reason]);
            }
        } elseif ($incidentCount === 3) {
            // Suspension 7 jours
            $bannedUntil = date('Y-m-d H:i:s', strtotime('+7 days'));
            $stmt = $db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
            $stmt->execute([$bannedUntil, $userId]);
            
            // Email de suspension (async)
            if ($patientEmail) {
                EmailQueue::add('suspension', $patientEmail, ['days' => 7, 'reason' => $reason]);
            }
        } elseif ($incidentCount >= 6) {
            // Bannissement définitif
            $bannedUntil = '9999-12-31 23:59:59';
            $stmt = $db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?');
            $stmt->execute([$bannedUntil, $userId]);
            
            // Email de bannissement (async)
            if ($patientEmail) {
                EmailQueue::add('ban', $patientEmail, ['reason' => $reason]);
            }
        }
        
        // Reset automatique après 90 jours
        // Vérifier si le dernier incident date de plus de 90 jours
        $stmt = $db->prepare('
            SELECT last_incident_at 
            FROM profiles 
            WHERE id = ? AND last_incident_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ');
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            $stmt = $db->prepare('UPDATE profiles SET incident_count = 0 WHERE id = ?');
            $stmt->execute([$userId]);
            $incidentCount = 0;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'incident_count' => $incidentCount,
                'banned_until' => $bannedUntil,
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

