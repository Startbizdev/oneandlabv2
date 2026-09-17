<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../lib/StaffPatientConsent.php';
require_once __DIR__ . '/../../lib/Logger.php';
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

$role = (string) ($user['role'] ?? '');
$isPatient = $role === 'patient';
$staffRoles = ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'];
if (!$isPatient && !in_array($role, $staffRoles, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$userModel = new User();
$relativeModel = new PatientRelative();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des proches du patient
    try {
        $patientId = $isPatient ? (string) $user['user_id'] : trim((string) ($_GET['patient_id'] ?? ''));
        if (!$isPatient && $patientId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Paramètre patient_id requis']);
            exit;
        }
        if (!$isPatient && !PatientDossierAccess::canAccess($db, $userModel, $user, $patientId)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        $relatives = $relativeModel->getByPatientId($patientId);

        // Logger la consultation de la liste des proches (HDS)
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'patient_relatives_list',
            null,
            [
                'relatives_count' => count($relatives),
                'patient_id' => $patientId,
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

        $patientId = $isPatient
            ? (string) $user['user_id']
            : trim((string) ($data['patient_id'] ?? ''));
        if (!$isPatient && $patientId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Champ patient_id requis']);
            exit;
        }
        if (
            !$isPatient
            && !$userModel->canStaffEditPatientProfile(
                (string) $user['user_id'],
                $role,
                $patientId
            )
        ) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        StaffPatientConsent::validateOrFail($data, $user);

        // Validation basique
        $allowedRelationships = ['child', 'parent', 'spouse', 'sibling', 'grandparent', 'grandchild', 'other'];
        if (!in_array($data['relationship_type'], $allowedRelationships)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Type de relation invalide']);
            exit;
        }

        // Whitelist stricte : n'utiliser que les champs du proche (ne jamais toucher profiles)
        $allowedKeys = ['first_name', 'last_name', 'relationship_type', 'gender', 'birth_date', 'email', 'phone', 'address'];
        $safeData = array_intersect_key($data, array_flip($allowedKeys));

        $id = $relativeModel->create($safeData, $patientId, $user);

        // Récupérer le proche créé pour le retourner
        $relative = $relativeModel->getById($id, $patientId);

        if (!$isPatient) {
            StaffPatientConsent::logRecorded($user, $patientId, 'patient_relative_create');
        }

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
