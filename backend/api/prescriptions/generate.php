<?php

/**
 * POST /prescriptions/generate
 * Body: { patient_id, prescription_text, prescription_kind?, appointment_id? }
 * Rendez-vous optionnel — patient_id obligatoire.
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/PrescriptionService.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
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
$role = $user['role'] ?? '';

if (!in_array($role, ['pro', 'nurse', 'super_admin'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'La génération d\'ordonnance est réservée aux professionnels de santé']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

if ($role === 'nurse' && ($input['prescription_kind'] ?? '') === PrescriptionService::KIND_MEDICAL) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Les infirmiers ne peuvent générer que des prescriptions d\'actes infirmiers']);
    exit;
}

try {
    $prescriptionKind = PrescriptionService::resolveKindForRole($role, $input['prescription_kind'] ?? null);
} catch (InvalidArgumentException $e) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$patientId = trim((string) ($input['patient_id'] ?? ''));
$appointmentId = isset($input['appointment_id']) ? trim((string) $input['appointment_id']) : null;
if ($appointmentId === '') {
    $appointmentId = null;
}

$resolved = PrescriptionService::resolvePrescriptionInput($input, $prescriptionKind);
$prescriptionText = $resolved['text'];
$prescriptionSections = $resolved['sections'];

$textError = PrescriptionService::validatePrescriptionText($prescriptionKind, $prescriptionText);
if ($textError !== null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $textError]);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$result = PrescriptionService::generatePrescriptionRequest(
    $db,
    $crypto,
    $user,
    $prescriptionText,
    $prescriptionKind,
    $patientId,
    $appointmentId,
    isset($input['prescription_date']) ? trim((string) $input['prescription_date']) : null,
    !empty($input['include_handwritten_signature']),
    $prescriptionSections
);

if (!$result['success']) {
    http_response_code($result['http'] ?? 400);
    echo json_encode(['success' => false, 'error' => $result['error'] ?? 'Erreur']);
    exit;
}

echo json_encode(['success' => true, 'data' => $result['data']]);
