<?php

/**
 * GET /patients/lookup?email=... — recherche exacte d’un patient par email (pro, nurse, lab, subaccount).
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../config/cors.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (!in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$lookupKey = $user['user_id'] . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!RateLimit::allow('patients_lookup', $lookupKey, 60, 60)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Réessayez dans une minute.']);
    exit;
}

$email = isset($_GET['email']) ? trim((string) $_GET['email']) : '';
if ($email === '' || !Validation::email($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Paramètre email invalide']);
    exit;
}

$userModel = new User();
$hash = hash('sha256', strtolower($email));
$patientId = $userModel->findPatientIdByEmailHash($hash);

if (!$patientId) {
    echo json_encode(['success' => true, 'data' => null]);
    exit;
}

try {
    $data = $userModel->getById($patientId, $user['user_id'], $user['role']);
    if (!$data || ($data['role'] ?? '') !== 'patient') {
        echo json_encode(['success' => true, 'data' => null]);
        exit;
    }
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
