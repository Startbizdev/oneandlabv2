<?php

/**
 * POST /patients/adopt — rattache un dossier patient lookup à « Mes patients » (PPA).
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/../../config/cors.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

CSRFMiddleware::handle();

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (!in_array($user['role'], User::patientListStaffRoles(), true) && ($user['role'] ?? '') !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$lookupKey = $user['user_id'] . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!RateLimit::allow('patients_adopt', $lookupKey, 40, 60)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Réessayez dans une minute.']);
    exit;
}

$input = json_decode((string) file_get_contents('php://input'), true);
$patientId = trim((string) ($input['patient_id'] ?? ''));
if (!Validation::uuid($patientId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'patient_id invalide']);
    exit;
}

$userModel = new User();
$result = $userModel->adoptPatientForStaff(
    (string) $user['user_id'],
    (string) $user['role'],
    $patientId
);

if (!$result['ok']) {
    $http = (int) ($result['http'] ?? 403);
    http_response_code($http);
    echo json_encode(['success' => false, 'error' => $result['error'] ?? 'Accès refusé']);
    exit;
}

echo json_encode(['success' => true, 'data' => ['patient_id' => $patientId]]);
