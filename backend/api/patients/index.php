<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/StaffPatientConsent.php';
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

    // Périmètre imposé par rôle (ignore created_by en query pour éviter l'escalade)
    if ($user['role'] === 'pro' || $user['role'] === 'nurse') {
        $filters['created_by'] = $user['user_id'];
    } elseif ($user['role'] === 'lab') {
        $filters['for_lab_owner_id'] = $user['user_id'];
    } elseif ($user['role'] === 'subaccount') {
        $filters['created_by'] = $user['user_id'];
    } elseif ($createdBy) {
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
    // Pros, nurses, lab, sous-comptes et super_admin
    if (!in_array($user['role'], ['pro', 'nurse', 'super_admin', 'lab', 'subaccount'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $emailOptional = in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true);
    $required = ['first_name', 'last_name', 'phone'];
    if (!$emailOptional) {
        $required[] = 'email';
    }
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Le champ $field est requis"]);
            exit;
        }
    }
    if (!$emailOptional && empty(trim((string) ($input['email'] ?? '')))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Le champ email est requis']);
        exit;
    }

    StaffPatientConsent::validateOrFail($input, $user);

    $emailTrim = isset($input['email']) ? trim((string) $input['email']) : '';
    if ($emailTrim !== '') {
        $dupHash = hash('sha256', strtolower($emailTrim));
        $existingId = $userModel->findPatientIdByEmailHash($dupHash);
        if ($existingId !== null) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Un patient existe déjà avec cet email',
                'existing_patient_id' => $existingId,
            ]);
            exit;
        }
    }
    
    // Créer le patient
    try {
        $birthDate = $input['birth_date'] ?? $input['date_of_birth'] ?? null;
        $patientData = [
            'email' => $emailTrim,
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'phone' => $input['phone'],
            'birth_date' => $birthDate ? trim((string) $birthDate) : null,
            'gender' => isset($input['gender']) && trim((string) $input['gender']) !== '' ? trim((string) $input['gender']) : null,
            'address' => $input['address'] ?? null,
            'role' => 'patient',
            'created_by' => $user['user_id'], // Associer au pro qui crée
        ];
        
        $patientId = $userModel->create($patientData, $user['user_id'], $user['role']);

        StaffPatientConsent::logRecorded($user, $patientId, 'patient_create');
        
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
