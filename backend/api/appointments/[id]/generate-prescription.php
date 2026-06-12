<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/PrescriptionService.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du rendez-vous requis']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$prescriptionText = trim($input['prescription_text'] ?? $input['prescription'] ?? '');

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

$textError = PrescriptionService::validatePrescriptionText($prescriptionKind, $prescriptionText);
if ($textError !== null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $textError]);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$stmt = $db->prepare('
    SELECT id, patient_id, type, status, assigned_nurse_id, assigned_lab_id, assigned_to, created_by,
           form_data_encrypted, form_data_dek, address_encrypted, address_dek
    FROM appointments WHERE id = ?
');
$stmt->execute([$appointmentId]);
$appointment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$appointment) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
    exit;
}
if ($appointment['status'] === 'canceled') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Impossible de créer une ordonnance pour un rendez-vous annulé']);
    exit;
}

if ($prescriptionKind === PrescriptionService::KIND_NURSING && ($appointment['type'] ?? '') !== 'nursing') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Les prescriptions infirmières ne peuvent être générées que pour des rendez-vous de soins infirmiers']);
    exit;
}

if (!PrescriptionService::canGenerateForAppointment($user, $appointment, $db)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé à ce rendez-vous']);
    exit;
}

$patientId = $appointment['patient_id'] ?? null;

$safeDecrypt = function ($encrypted, $dek) use ($crypto) {
    if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') {
        return '';
    }
    try {
        return $crypto->decryptField((string) $encrypted, (string) $dek);
    } catch (Throwable $e) {
        return '';
    }
};

$prescriberStmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, address_encrypted, address_dek, rpps_encrypted, rpps_dek, adeli_encrypted, adeli_dek, emploi FROM profiles WHERE id = ?');
$prescriberStmt->execute([$user['user_id']]);
$prescriberRow = $prescriberStmt->fetch(PDO::FETCH_ASSOC);
$prescriberRow = is_array($prescriberRow) ? $prescriberRow : [];
$prescriber = [
    'first_name' => $safeDecrypt($prescriberRow['first_name_encrypted'] ?? null, $prescriberRow['first_name_dek'] ?? null),
    'last_name' => $safeDecrypt($prescriberRow['last_name_encrypted'] ?? null, $prescriberRow['last_name_dek'] ?? null),
    'title' => (isset($prescriberRow['emploi']) && trim((string) $prescriberRow['emploi']) !== '') ? trim((string) $prescriberRow['emploi']) : ($role === 'nurse' ? 'Infirmier(ère)' : 'Dr'),
    'address' => $safeDecrypt($prescriberRow['address_encrypted'] ?? null, $prescriberRow['address_dek'] ?? null) ?: null,
    'rpps' => $safeDecrypt($prescriberRow['rpps_encrypted'] ?? null, $prescriberRow['rpps_dek'] ?? null),
    'adeli' => $safeDecrypt($prescriberRow['adeli_encrypted'] ?? null, $prescriberRow['adeli_dek'] ?? null),
];

$credentialError = PrescriptionService::validatePrescriberCredentials($role, $prescriber);
if ($credentialError !== null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $credentialError]);
    exit;
}

$patient = ['first_name' => '', 'last_name' => '', 'birth_date' => '', 'address' => null, 'nir' => ''];
if ($patientId) {
    $patientStmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, birth_date_encrypted, birth_date_dek, address_encrypted, address_dek FROM profiles WHERE id = ?');
    $patientStmt->execute([$patientId]);
    $patientRow = $patientStmt->fetch(PDO::FETCH_ASSOC);
    $patientRow = is_array($patientRow) ? $patientRow : [];
    $patient = [
        'first_name' => $safeDecrypt($patientRow['first_name_encrypted'] ?? null, $patientRow['first_name_dek'] ?? null),
        'last_name' => $safeDecrypt($patientRow['last_name_encrypted'] ?? null, $patientRow['last_name_dek'] ?? null),
        'birth_date' => $safeDecrypt($patientRow['birth_date_encrypted'] ?? null, $patientRow['birth_date_dek'] ?? null),
        'address' => $safeDecrypt($patientRow['address_encrypted'] ?? null, $patientRow['address_dek'] ?? null) ?: null,
        'nir' => '',
    ];
}

$formData = [];
if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
    try {
        $fd = $crypto->decryptField($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        $formData = is_string($fd) ? json_decode($fd, true) ?? [] : (is_array($fd) ? $fd : []);
    } catch (Exception $e) {
        $formData = [];
    }
}
if (empty($patient['first_name']) && !empty($formData['first_name'])) {
    $patient['first_name'] = (string) $formData['first_name'];
}
if (empty($patient['last_name']) && !empty($formData['last_name'])) {
    $patient['last_name'] = (string) $formData['last_name'];
}
if (empty($patient['birth_date']) && !empty($formData['birth_date'])) {
    $patient['birth_date'] = (string) $formData['birth_date'];
}
if (!$patientId && (empty($patient['first_name']) || empty($patient['last_name']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous sans patient associé (identité indisponible pour l\'ordonnance).']);
    exit;
}

try {
    $result = PrescriptionService::generatePdf($prescriber, $patient, $prescriptionText, $prescriptionKind);
} catch (Throwable $e) {
    error_log('PrescriptionPdf error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la génération du PDF.']);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'pdf_base64' => $result['pdf_base64'],
        'file_name' => $result['file_name'],
        'prescription_number' => $result['prescription_number'],
        'prescription_kind' => $result['prescription_kind'],
        'prescription_text' => $prescriptionText,
    ],
]);
