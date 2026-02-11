<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
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

$userModel = new User();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des patients avec filtres
    $createdBy = $_GET['created_by'] ?? null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 50);
    
    // Valider les paramètres
    if ($page < 1) {
        $page = 1;
    }
    if ($limit < 1 || $limit > 100) {
        $limit = 50;
    }
    
    // Filtres de base: rôle patient
    $filters = ['role' => 'patient'];
    
    // Si created_by est fourni, filtrer par créateur
    if ($createdBy) {
        $filters['created_by'] = $createdBy;
    }
    
    // Récupérer les patients
    $result = $userModel->getAll($filters, $page, $limit, $user['user_id'], $user['role']);
    
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
    // Créer un nouveau patient
    // Seuls les pros peuvent créer des patients
    if ($user['role'] !== 'pro' && $user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation des champs requis
    $required = ['email', 'first_name', 'last_name', 'phone'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Le champ $field est requis"]);
            exit;
        }
    }
    
    // Créer le patient
    try {
        $patientData = [
            'email' => $input['email'],
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'phone' => $input['phone'],
            'date_of_birth' => $input['date_of_birth'] ?? null,
            'address' => $input['address'] ?? null,
            'role' => 'patient',
            'created_by' => $user['user_id'], // Associer au pro qui crée
        ];
        
        $patientId = $userModel->create($patientData, $user['user_id'], $user['role']);
        
        // Récupérer le patient créé
        $newPatient = $userModel->getById($patientId, $user['user_id'], $user['role']);
        
        echo json_encode([
            'success' => true,
            'data' => $newPatient,
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
        ]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
