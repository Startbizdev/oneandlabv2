<?php

declare(strict_types=1);

/**
 * Debug accès documents dossier patient (CLI prod).
 * Usage: php scripts/debug-patient-docs-access.php <patient_id> [staff_user_id]
 */

$patientId = $argv[1] ?? '';
$staffId = $argv[2] ?? '';

if ($patientId === '') {
    fwrite(STDERR, "Usage: php scripts/debug-patient-docs-access.php <patient_id> [staff_user_id]\n");
    exit(1);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../lib/PatientDossierDocuments.php';
require_once __DIR__ . '/../lib/MedicalDocumentAccess.php';
require_once __DIR__ . '/../models/User.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$userModel = new User();

echo "=== Patient $patientId ===\n";
$prof = $db->prepare('SELECT id, role, created_by, first_name_encrypted IS NOT NULL AS has_name FROM profiles WHERE id = ?');
$prof->execute([$patientId]);
print_r($prof->fetch(PDO::FETCH_ASSOC));

echo "\n=== patient_documents ===\n";
$pd = $db->prepare('
    SELECT pd.document_type, pd.medical_document_id, md.file_name
    FROM patient_documents pd
    LEFT JOIN medical_documents md ON md.id = pd.medical_document_id
    WHERE pd.patient_id = ?
');
$pd->execute([$patientId]);
$rows = $pd->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
echo 'count=' . count($rows) . "\n";

echo "\n=== listForPatient API payload ===\n";
$list = PatientDossierDocuments::listForPatient($db, $patientId);
echo 'count=' . count($list) . "\n";
foreach ($list as $doc) {
    echo ($doc['document_type'] ?? '?') . ' medical=' . ($doc['medical_document_id'] ?? $doc['id'] ?? '') . ' source=' . ($doc['source'] ?? '') . "\n";
}

echo "\n=== appointments (sample) ===\n";
$apt = $db->prepare('SELECT id, created_by, assigned_nurse_id, assigned_lab_id, assigned_to, type FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC LIMIT 8');
$apt->execute([$patientId]);
print_r($apt->fetchAll(PDO::FETCH_ASSOC));

if ($staffId !== '') {
    $roleStmt = $db->prepare('SELECT id, role FROM profiles WHERE id = ?');
    $roleStmt->execute([$staffId]);
    $staff = $roleStmt->fetch(PDO::FETCH_ASSOC);
    echo "\n=== Staff $staffId (" . ($staff['role'] ?? '?') . ") access ===\n";
    $user = ['user_id' => $staffId, 'role' => $staff['role'] ?? ''];
    $can = PatientDossierAccess::canAccess($db, $userModel, $user, $patientId);
    echo 'PatientDossierAccess::canAccess=' . ($can ? 'YES' : 'NO') . "\n";
    echo 'MedicalDocumentAccess::userHasProfileDocumentAccess=' . (MedicalDocumentAccess::userHasProfileDocumentAccess($db, $user, $patientId) ? 'YES' : 'NO') . "\n";
} else {
    echo "\n=== Staff access (nurses on appointments) ===\n";
    $nurses = $db->prepare('SELECT DISTINCT assigned_nurse_id FROM appointments WHERE patient_id = ? AND assigned_nurse_id IS NOT NULL');
    $nurses->execute([$patientId]);
    foreach ($nurses->fetchAll(PDO::FETCH_COLUMN) as $nurseId) {
        $roleStmt = $db->prepare('SELECT role FROM profiles WHERE id = ?');
        $roleStmt->execute([$nurseId]);
        $role = $roleStmt->fetchColumn();
        $user = ['user_id' => (string) $nurseId, 'role' => (string) $role];
        $can = PatientDossierAccess::canAccess($db, $userModel, $user, $patientId);
        echo "$nurseId ($role): " . ($can ? 'YES' : 'NO') . "\n";
    }
}
