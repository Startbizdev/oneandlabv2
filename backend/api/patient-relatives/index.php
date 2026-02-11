<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification requise
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Seuls les patients peuvent gérer leurs proches
if ($user['role'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$relativeModel = new PatientRelative();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des proches du patient
    try {
        $relatives = $relativeModel->getByPatientId($user['user_id']);

        // Logger la consultation de la liste des proches (HDS)
        require_once __DIR__ . '/../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'patient_relatives_list',
            null,
            [
                'relatives_count' => count($relatives),
                'has_sensitive_data' => count(array_filter($relatives, fn($r) => !empty($r['email']) || !empty($r['phone']))) > 0
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $relatives,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Créer un nouveau proche
    CSRFMiddleware::handle();

    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['first_name']) || !isset($data['last_name']) || !isset($data['relationship_type'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides : prénom, nom et type de relation requis']);
            exit;
        }

        // Validation basique
        $allowedRelationships = ['child', 'parent', 'spouse', 'sibling', 'grandparent', 'grandchild', 'other'];
        if (!in_array($data['relationship_type'], $allowedRelationships)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Type de relation invalide']);
            exit;
        }

        $id = $relativeModel->create($data, $user['user_id']);

        // Récupérer le proche créé pour le retourner
        $relative = $relativeModel->getById($id, $user['user_id']);

        echo json_encode([
            'success' => true,
            'data' => $relative
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
