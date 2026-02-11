<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/RegistrationRequest.php';

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

// POST = création publique (sans auth)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $role = trim((string)($body['role'] ?? ''));
    if (!in_array($role, ['lab', 'pro', 'nurse'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Rôle invalide. Attendu: lab, pro ou nurse.']);
        exit;
    }
    $email = trim((string)($body['email'] ?? ''));
    $first_name = trim((string)($body['first_name'] ?? ''));
    $last_name = trim((string)($body['last_name'] ?? ''));
    if ($email === '' || $first_name === '' || $last_name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email, prénom et nom sont requis.']);
        exit;
    }
    if ($role === 'lab' && empty(trim((string)($body['siret'] ?? '')))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Le SIRET est obligatoire pour un laboratoire.']);
        exit;
    }
    if ($role === 'pro' && empty(trim((string)($body['adeli'] ?? '')))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Le numéro Adeli est obligatoire pour un professionnel de santé.']);
        exit;
    }
    if ($role === 'nurse' && empty(trim((string)($body['rpps'] ?? '')))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Le numéro RPPS est obligatoire pour un infirmier.']);
        exit;
    }
    try {
        $model = new RegistrationRequest();
        $id = $model->create($body);
        echo json_encode(['success' => true, 'data' => ['id' => $id]]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// GET = liste admin (auth requise)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
    require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
    $auth = new AuthMiddleware();
    $user = $auth->handle();
    $roleMw = new RoleMiddleware();
    $roleMw->handle($user, ['super_admin']);
    $status = trim((string)($_GET['status'] ?? ''));
    $roleFilter = trim((string)($_GET['role'] ?? ''));
    try {
        $model = new RegistrationRequest();
        $list = $model->getAll($status, $roleFilter);
        echo json_encode(['success' => true, 'data' => $list]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
