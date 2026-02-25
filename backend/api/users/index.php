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
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Pro : autoriser GET uniquement pour lister lab/sublab/infirmiers (assignation RDV)
$isProListingAssignable = ($_SERVER['REQUEST_METHOD'] === 'GET' && $user['role'] === 'pro');
$roleParam = isset($_GET['role']) ? trim((string) $_GET['role']) : null;
if ($isProListingAssignable && in_array($roleParam, ['lab', 'subaccount', 'nurse'], true)) {
    // Pro peut lister labos, sous-comptes et infirmiers pour assigner un RDV
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

    if ($email === '' || $first_name === '' || $last_name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email, prénom et nom sont requis.']);
        exit;
    }

    $allowedRoles = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];
    if (!in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Rôle invalide.']);
        exit;
    }

    $createData = [
        'email' => $email,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'role' => $role,
        'phone' => $phone ?: '',
    ];
    if (in_array($role, ['lab', 'subaccount'], true) && !empty(trim((string)($body['company_name'] ?? '')))) {
        $createData['company_name'] = trim((string)$body['company_name']);
    }
    if (in_array($role, ['subaccount', 'preleveur'], true) && !empty(trim((string)($body['lab_id'] ?? '')))) {
        $createData['lab_id'] = trim((string)$body['lab_id']);
    }
    try {
        $userId = $userModel->create($createData, $user['user_id'], $user['role']);
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
    if ($limit < 1 || $limit > 100) {
        $limit = 20;
    }
    
    // Construire les filtres
    $filters = [];
    if ($role) {
        // Valider le rôle
        $allowedRoles = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];
        if (in_array($role, $allowedRoles, true)) {
            $filters['role'] = $role;
        }
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




