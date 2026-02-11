<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Vérifier CSRF pour les requêtes modifiantes
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    CSRFMiddleware::handle();
}

$appointmentModel = new Appointment();

// Extraire l'ID depuis l'URL (nécessite un routeur, pour l'instant on utilise $_GET)
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'un rendez-vous
    try {
        // Vérifier les permissions avant de récupérer le rendez-vous
        require_once __DIR__ . '/../../config/database.php';
        $config = require __DIR__ . '/../../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $stmt = $db->prepare('
            SELECT patient_id, assigned_nurse_id, assigned_lab_id, created_by, type, status, location_lat, location_lng
            FROM appointments
            WHERE id = ?
        ');
        $stmt->execute([$id]);
        $appointmentCheck = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$appointmentCheck) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }
        
        // Vérifier les permissions d'accès de base
        $hasAccess = (
            $appointmentCheck['patient_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_nurse_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_lab_id'] === $user['user_id'] ||
            $appointmentCheck['created_by'] === $user['user_id'] ||
            $user['role'] === 'super_admin'
        );
        
        // Les infirmiers ne peuvent accéder qu'aux rendez-vous de type "nursing"
        if ($user['role'] === 'nurse' && $appointmentCheck['type'] !== 'nursing') {
            $hasAccess = false;
        }
        
        // Pour les infirmiers : vérifier aussi si le rendez-vous est pending, non assigné et dans leur zone de couverture
        // MAIS seulement pour les rendez-vous de type "nursing" (pas les prises de sang)
        if (!$hasAccess && $user['role'] === 'nurse' && 
            $appointmentCheck['type'] === 'nursing' &&
            $appointmentCheck['status'] === 'pending' && 
            empty($appointmentCheck['assigned_nurse_id']) &&
            !empty($appointmentCheck['location_lat']) && 
            !empty($appointmentCheck['location_lng'])) {
            
            // Récupérer la zone de couverture de l'infirmier
            $coverageZoneSql = 'SELECT center_lat, center_lng, radius_km FROM coverage_zones WHERE owner_id = ? AND role = ? AND is_active = TRUE LIMIT 1';
            $coverageStmt = $db->prepare($coverageZoneSql);
            $coverageStmt->execute([$user['user_id'], 'nurse']);
            $coverageZone = $coverageStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($coverageZone && $coverageZone['center_lat'] && $coverageZone['center_lng'] && $coverageZone['radius_km']) {
                $centerLat = floatval($coverageZone['center_lat']);
                $centerLng = floatval($coverageZone['center_lng']);
                $radiusKm = floatval($coverageZone['radius_km']);
                $appointmentLat = floatval($appointmentCheck['location_lat']);
                $appointmentLng = floatval($appointmentCheck['location_lng']);
                
                // Calculer la distance (formule de Haversine)
                $distance = 6371 * acos(
                    cos($centerLat * M_PI / 180) * cos($appointmentLat * M_PI / 180) *
                    cos($appointmentLng * M_PI / 180 - $centerLng * M_PI / 180) +
                    sin($centerLat * M_PI / 180) * sin($appointmentLat * M_PI / 180)
                );
                
                // Si le rendez-vous est dans la zone de couverture, autoriser l'accès
                if ($distance <= $radiusKm) {
                    $hasAccess = true;
                }
            }
        }
        
        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Accès refusé à ce rendez-vous',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        
        $appointment = $appointmentModel->getById($id, $user['user_id'], $user['role']);
        
        if (!$appointment) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        // Logger la consultation de rendez-vous (HDS)
        require_once __DIR__ . '/../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'appointment',
            $id,
            [
                'status' => $appointment['status'],
                'type' => $appointment['type'],
                'has_relative' => !empty($appointment['relative']),
                'has_sensitive_data' => !empty($appointment['address']) || !empty($appointment['form_data'])
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $appointment,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Données invalides']);
        exit;
    }

    $isFullUpdate = isset($input['form_data']) || isset($input['scheduled_at']) || isset($input['address']);

    try {
        if ($isFullUpdate) {
            require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
            $roleMiddleware = new RoleMiddleware();
            $roleMiddleware->handle($user, ['super_admin']);
            $appointmentModel->update($id, $input, $user['user_id'], $user['role']);
        } else {
            if (!isset($input['status'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Statut requis']);
                exit;
            }
            $redispatch = isset($input['redispatch']) && $input['redispatch'] === true;
            if ($redispatch && $input['status'] !== 'pending') {
                throw new Exception('Le redispatch nécessite un statut "pending"');
            }
            if ($redispatch && !in_array($user['role'], ['nurse', 'lab', 'subaccount'])) {
                throw new Exception('Seuls les professionnels de santé assignés peuvent redispatcher un rendez-vous');
            }
            $appointmentModel->updateStatus(
                $id,
                $input['status'],
                $user['user_id'],
                $user['role'],
                $input['note'] ?? null,
                $redispatch
            );
            if ($redispatch) {
                require_once __DIR__ . '/../../lib/Logger.php';
                $logger = new Logger();
                $logger->log($user['user_id'], $user['role'], 'redispatch', 'appointment', $id, [
                    'action' => 'redispatch',
                    'reason' => 'professional_unavailable'
                ]);
            }
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'VALIDATION_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

