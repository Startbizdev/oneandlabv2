<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../models/User.php';

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

if (!in_array($user['role'] ?? '', ['pro', 'super_admin'], true)) {
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
if (empty($prescriptionText)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Le texte de la prescription est requis']);
    exit;
}
if (strlen($prescriptionText) > 10000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'La prescription ne doit pas dépasser 10 000 caractères']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$stmt = $db->prepare('
    SELECT id, patient_id, type, status, assigned_nurse_id, assigned_lab_id, created_by,
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

$hasAccess = (
    $appointment['assigned_nurse_id'] === $user['user_id'] ||
    $appointment['created_by'] === $user['user_id'] ||
    $user['role'] === 'super_admin'
);
if (!$hasAccess && $appointment['type'] === 'blood_test') {
    $teamStmt = $db->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
    $teamStmt->execute([$user['user_id'], $user['user_id']]);
    $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
    if (in_array($appointment['assigned_lab_id'] ?? '', $teamIds, true)) {
        $hasAccess = true;
    }
}
if (!$hasAccess && $user['role'] === 'pro') {
    $userModel = new User();
    if (
        $appointment['created_by'] === $user['user_id']
        || $userModel->hasProfessionalAccessToPatient($user['user_id'], (string) ($appointment['patient_id'] ?? ''))
    ) {
        $hasAccess = true;
    }
}
if (!$hasAccess) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé à ce rendez-vous']);
    exit;
}

$patientId = $appointment['patient_id'] ?? null;

/** Déchiffre seulement si les deux valeurs sont non vides (évite TypeError si colonnes NULL). */
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
    'title' => (isset($prescriberRow['emploi']) && trim((string) $prescriberRow['emploi']) !== '') ? trim((string) $prescriberRow['emploi']) : ($user['role'] === 'nurse' ? 'Infirmier(ère)' : 'Dr'),
    'address' => $safeDecrypt($prescriberRow['address_encrypted'] ?? null, $prescriberRow['address_dek'] ?? null) ?: null,
    'rpps' => $safeDecrypt($prescriberRow['rpps_encrypted'] ?? null, $prescriberRow['rpps_dek'] ?? null),
    'adeli' => $safeDecrypt($prescriberRow['adeli_encrypted'] ?? null, $prescriberRow['adeli_dek'] ?? null),
];

$patient = ['first_name' => '', 'last_name' => '', 'birth_date' => '', 'address' => null];
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
    require_once __DIR__ . '/../../../lib/PrescriptionPdf.php';
    $pdfContent = PrescriptionPdf::generate($prescriber, $patient, $prescriptionText);
} catch (Throwable $e) {
    error_log('PrescriptionPdf error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de la génération du PDF. Vérifiez que dompdf est installé (composer require dompdf/dompdf).']);
    exit;
}

$pdfBase64 = base64_encode($pdfContent);
echo json_encode([
    'success' => true,
    'data' => [
        'pdf_base64' => $pdfBase64,
        'file_name' => 'ordonnance-' . $appointmentId . '.pdf',
    ],
]);
