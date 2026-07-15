<?php
declare(strict_types=1);

/**
 * Reproduit le flux formulaire RDV classique (staff) : patient sans email → POST appointment.
 * Usage: php scripts/debug-classic-form-appointment.php [nurse_email]
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Appointment.php';

$nurseEmail = $argv[1] ?? 'chloeidel8@gmail.com';
$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']),
    $config['username'],
    $config['password']
);

$hash = hash('sha256', strtolower(trim($nurseEmail)));
$stmt = $pdo->prepare('SELECT id, role FROM profiles WHERE email_hash = ? LIMIT 1');
$stmt->execute([$hash]);
$nurse = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$nurse) {
    fwrite(STDERR, "Nurse not found: $nurseEmail\n");
    exit(1);
}
$nurseId = (string) $nurse['id'];
$role = (string) $nurse['role'];
echo "=== NURSE $nurseId role=$role ===\n\n";

$userModel = new User();
$appointmentModel = new Appointment();

// 1) Créer patient sans email (comme formulaire mobile)
echo "--- Step 1: create patient sans email ---\n";
try {
    $patientId = $userModel->create([
        'role' => 'patient',
        'first_name' => 'DebugForm',
        'last_name' => 'SansMail' . substr((string) time(), -4),
        'phone' => '0621542927',
        'birth_date' => '1985-06-15',
        'gender' => 'male',
        'address' => [
            'label' => '10 Rue de Rome, 13006 Marseille, France',
            'lat' => 43.294876,
            'lng' => 5.3784915,
        ],
        'created_by' => $nurseId,
    ], $nurseId, $role);
    $patient = $userModel->getById($patientId, $nurseId, $role);
    echo "OK patient_id=$patientId email=" . ($patient['email'] ?? '') . "\n";
} catch (Throwable $e) {
    echo 'FAIL patient: ' . $e->getMessage() . "\n";
    exit(1);
}

// 2) Créer RDV nursing (payload aligné wizard mobile)
echo "\n--- Step 2: create appointment ---\n";
$payload = [
    'type' => 'nursing',
    'form_type' => 'nursing',
    'category_id' => '8cd3ac87-1a34-11f1-af39-0eb6988ed0bd',
    'patient_id' => $patientId,
    'status' => 'confirmed',
    'assigned_nurse_id' => $nurseId,
    'patient_booking_consent' => true,
    'scheduled_at' => '2026-07-10 14:00:00',
    'address' => [
        'label' => '10 Rue de Rome, 13006 Marseille, France',
        'lat' => 43.294876,
        'lng' => 5.3784915,
    ],
    'form_data' => [
        'first_name' => 'DebugForm',
        'last_name' => 'SansMail',
        'phone' => '0621542927',
        'email' => '',
        'gender' => 'male',
        'birth_date' => '1985-06-15',
        'availability' => json_encode(['type' => 'custom', 'range' => [14, 15]]),
        'duration_days' => '7',
        'frequency' => 'daily',
        'preferred_nurse_gender' => 'any',
    ],
    'files' => [],
];

try {
    $aptId = $appointmentModel->create($payload, $nurseId, $role);
    echo "OK appointment_id=$aptId\n";
} catch (Throwable $e) {
    echo 'FAIL appointment: ' . $e->getMessage() . "\n";
    $j = json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => 'VALIDATION_ERROR']);
    echo 'JSON len=' . strlen((string) $j) . " body=$j\n";
}

// 3) Erreurs 129 bytes connues
echo "\n--- Known 129-byte responses ---\n";
$candidates = [
    'patient_id ou guest_email requis.',
    'La date du rendez-vous ne peut pas être dans le passé.',
    'Le consentement patient est requis pour cette action.',
    'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.',
    'La date du rendez-vous doit être au moins 24h à l\'avance par rapport à maintenant.',
    'Type de rendez-vous invalide. Doit être "blood_test" ou "nursing".',
    'Adresse incomplète. Requis: label, lat, lng.',
    'Format de date invalide. Formats acceptés: Y-m-d H:i:s, Y-m-dTH:i, d/m/Y H:i',
];
foreach ($candidates as $msg) {
    $j = json_encode(['success' => false, 'error' => $msg, 'code' => 'VALIDATION_ERROR']);
    echo strlen((string) $j) . " => $msg\n";
}
$consent = json_encode([
    'success' => false,
    'error' => 'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.',
    'code' => 'PATIENT_BOOKING_CONSENT_REQUIRED',
]);
echo strlen((string) $consent) . " => consent StaffPatientConsent exit\n";
