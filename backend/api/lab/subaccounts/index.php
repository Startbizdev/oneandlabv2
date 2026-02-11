<?php

/**
 * API Lab - Sous-comptes
 * GET: Liste des sous-comptes du laboratoire
 * POST: Créer un sous-compte
 * Conformité HDS: données chiffrées, logs d'audit
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if ($user['role'] !== 'lab') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux laboratoires']);
    exit;
}

$userModel = new User();
$labId = $user['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
    
    $result = $userModel->getAll(
        ['role' => 'subaccount', 'lab_id' => $labId],
        $page,
        $limit,
        $labId,
        'lab'
    );
    
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
    CSRFMiddleware::handle();
    
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $email = trim($input['email'] ?? '');
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    
    if (empty($email) || empty($firstName) || empty($lastName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email, prénom et nom sont requis']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email invalide']);
        exit;
    }
    
    try {
        $id = $userModel->create([
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => $phone ?: null,
            'role' => 'subaccount',
            'lab_id' => $labId,
        ], $labId, 'lab');
        
        echo json_encode(['success' => true, 'data' => ['id' => $id]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
