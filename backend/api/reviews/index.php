<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Review.php';
require_once __DIR__ . '/../../models/Notification.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$reviewModel = new Review();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des avis avec filtres
    $revieweeId = $_GET['reviewee_id'] ?? null;
    $appointmentId = $_GET['appointment_id'] ?? null;
    $revieweeType = $_GET['reviewee_type'] ?? null;
    $isVisible = isset($_GET['is_visible']) ? filter_var($_GET['is_visible'], FILTER_VALIDATE_BOOLEAN) : null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    
    // Valider les paramètres
    if ($page < 1) {
        $page = 1;
    }
    if ($limit < 1 || $limit > 100) {
        $limit = 20;
    }
    
    // Construire les filtres
    $filters = [];
    if ($revieweeId) {
        $filters['reviewee_id'] = $revieweeId;
    }
    if ($appointmentId) {
        $filters['appointment_id'] = $appointmentId;
    }
    if ($revieweeType) {
        $filters['reviewee_type'] = $revieweeType;
    }
    if ($isVisible !== null) {
        $filters['is_visible'] = $isVisible;
    }
    
    // Récupérer les avis avec pagination
    $result = $reviewModel->getAll($filters, $page, $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'pagination' => [
            'page' => $result['page'],
            'limit' => $result['limit'],
            'total' => $result['total'],
            'pages' => $result['pages'],
        ],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Seuls les patients peuvent déposer un avis
    if (($user['role'] ?? '') !== 'patient') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Seuls les patients peuvent déposer un avis.',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }

    // Création d'un avis
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        if (!isset($input['appointment_id'], $input['reviewee_id'], $input['rating'])) {
            throw new Exception('appointment_id, reviewee_id et rating requis');
        }
        if (!isset($input['reviewee_type']) || $input['reviewee_type'] === '') {
            throw new Exception('reviewee_type requis');
        }
        
        if ($input['rating'] < 1 || $input['rating'] > 5) {
            throw new Exception('La note doit être entre 1 et 5');
        }

        $config = require __DIR__ . '/../../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

        // Vérifier que le rendez-vous existe, appartient au patient, est terminé, et que le reviewee correspond
        $stmtApt = $db->prepare('
            SELECT id, patient_id, status, type, assigned_nurse_id, assigned_lab_id, assigned_to
            FROM appointments WHERE id = ?
        ');
        $stmtApt->execute([$input['appointment_id']]);
        $apt = $stmtApt->fetch(PDO::FETCH_ASSOC);
        if (!$apt) {
            throw new Exception('Rendez-vous introuvable');
        }
        if ($apt['patient_id'] !== $user['user_id']) {
            throw new Exception('Ce rendez-vous ne vous appartient pas');
        }
        if ($apt['status'] !== 'completed') {
            throw new Exception('Vous ne pouvez noter qu\'un rendez-vous terminé');
        }
        $revieweeId = $input['reviewee_id'];
        $revieweeType = $input['reviewee_type'];
        $match = false;
        if ($revieweeType === 'nurse') {
            $match = !empty($apt['assigned_nurse_id']) && $apt['assigned_nurse_id'] === $revieweeId;
        } else {
            $match = (!empty($apt['assigned_lab_id']) && $apt['assigned_lab_id'] === $revieweeId)
                || (!empty($apt['assigned_to']) && $apt['assigned_to'] === $revieweeId);
        }
        if (!$match) {
            throw new Exception('Ce professionnel n\'a pas effectué ce rendez-vous');
        }

        // Éviter un doublon d'avis pour le même rendez-vous
        $stmtExists = $db->prepare('SELECT id FROM reviews WHERE appointment_id = ? LIMIT 1');
        $stmtExists->execute([$input['appointment_id']]);
        if ($stmtExists->fetch()) {
            throw new Exception('Vous avez déjà laissé un avis pour ce rendez-vous');
        }
        
        $id = $reviewModel->create($input, $user['user_id']);
        
        $revieweeId = $input['reviewee_id'];
        $notificationModel = new Notification();
        $notificationModel->create(
            $revieweeId,
            'new_review',
            'Nouvel avis reçu',
            'Un patient a laissé un avis sur votre profil.',
            ['review_id' => $id]
        );
        
        echo json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
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

