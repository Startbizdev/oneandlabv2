<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
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

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Pro / Nurse : autoriser GET pour lister lab/sublab/infirmiers (assignation RDV)
$isListingAssignable = ($_SERVER['REQUEST_METHOD'] === 'GET' && in_array($user['role'], ['pro', 'nurse'], true));
$roleParam = isset($_GET['role']) ? trim((string) $_GET['role']) : null;
$allowedRolesForListing = ['lab', 'subaccount', 'nurse'];
if ($isListingAssignable && in_array($roleParam, $allowedRolesForListing, true)) {
    // Pro et nurse peuvent lister labos, sous-comptes et infirmiers pour assigner un RDV
} else {
    $roleMiddleware = new RoleMiddleware();
    $roleMiddleware->handle($user, ['super_admin']);
}

$userModel = new User();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Création d'un utilisateur par un admin
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = trim((string)($body['email'] ?? ''));
    $first_name = trim((string)($body['first_name'] ?? ''));
    $last_name = trim((string)($body['last_name'] ?? ''));
    $role = trim((string)($body['role'] ?? 'patient'));
    $phone = isset($body['phone']) ? trim((string)$body['phone']) : null;
    $company_name = trim((string)($body['company_name'] ?? ''));

    $allowedRoles = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];
    if (!in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Rôle invalide.']);
        exit;
    }

    $isEntityRole = in_array($role, ['lab', 'subaccount'], true);
    if ($email === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'L\'email est requis.']);
        exit;
    }
    if ($isEntityRole) {
        if ($company_name === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Le nom du laboratoire / de l\'entité est requis.']);
            exit;
        }
        $first_name = '';
        $last_name = $company_name;
    } else {
        if ($first_name === '' || $last_name === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Prénom et nom sont requis.']);
            exit;
        }
    }

    $createData = [
        'email' => $email,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'role' => $role,
        'phone' => $phone ?: '',
    ];
    if ($isEntityRole && $company_name !== '') {
        $createData['company_name'] = $company_name;
    }
    if (in_array($role, ['subaccount', 'preleveur'], true) && !empty(trim((string)($body['lab_id'] ?? '')))) {
        $createData['lab_id'] = trim((string)$body['lab_id']);
    }
    try {
        $userId = $userModel->create($createData, $user['user_id'], $user['role']);
        // Tout envoi d'email / notification doit passer par EmailQueue (flush en shutdown, après la réponse HTTP)
        echo json_encode(['success' => true, 'data' => ['id' => $userId]]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Liste des utilisateurs avec filtres
    $role = $_GET['role'] ?? null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    
    // Valider les paramètres
    if ($page < 1) {
        $page = 1;
    }
    $isSuperAdmin = ($user['role'] ?? '') === 'super_admin';
    $maxLimit = $isSuperAdmin ? 500 : 100;
    if ($limit < 1 || $limit > $maxLimit) {
        $limit = 20;
    }
    
    // Construire les filtres
    $filters = [];
    if ($role) {
        $allowedRoles = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];
        if (in_array($role, $allowedRoles, true)) {
            $filters['role'] = $role;
        }
    }
    $status = $_GET['status'] ?? null;
    if ($status && in_array($status, ['active', 'suspended', 'banned'], true)) {
        $filters['status'] = $status;
    }
    
    // Récupérer les utilisateurs avec pagination
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
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}




