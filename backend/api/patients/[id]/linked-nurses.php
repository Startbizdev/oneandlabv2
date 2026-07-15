<?php

declare(strict_types=1);

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../lib/PatientLinkedNurses.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

$patientId = $_GET['id'] ?? null;
if (!$patientId || !is_string($patientId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID patient requis']);
    exit;
}

if (!in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

$userModel = new User();
$patientStmt = $db->prepare('SELECT id, created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
$patientStmt->execute([$patientId, 'patient']);
$patient = $patientStmt->fetch(PDO::FETCH_ASSOC);
if (!$patient) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Patient introuvable']);
    exit;
}

$requesterId = (string) $user['user_id'];
$role = (string) $user['role'];
$allowed = $role === 'super_admin'
    || (string) ($patient['created_by'] ?? '') === $requesterId
    || $userModel->hasProfessionalAccessToPatient($requesterId, (string) $patientId);

if (!$allowed) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé à ce patient']);
    exit;
}

try {
    $nurses = PatientLinkedNurses::listForPatient($db, (string) $patientId);
    echo json_encode([
        'success' => true,
        'data' => $nurses,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('linked-nurses: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors du chargement des infirmiers']);
}
