<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/PatientDocumentLibrary.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, patient_id TEXT, relative_id TEXT)');
$db->exec('CREATE TABLE patient_documents (medical_document_id TEXT, patient_id TEXT)');
$db->exec('CREATE TABLE medical_documents (id TEXT PRIMARY KEY, appointment_id TEXT, patient_id TEXT, uploaded_by TEXT, file_name TEXT, file_size INTEGER, mime_type TEXT, document_type TEXT, created_at TEXT)');
$db->exec("INSERT INTO appointments VALUES ('own', 'patient-a', NULL), ('other', 'patient-b', NULL), ('relative', 'patient-a', 'relative-a')");
$insert = $db->prepare('INSERT INTO medical_documents VALUES (?, ?, ?, ?, ?, 10, ?, ?, ?)');
foreach ([
    ['own-appointment', 'own', null, 'nurse', 'resultats'],
    ['other-appointment', 'other', null, 'patient-b', 'resultats'],
    ['relative-appointment', 'relative', null, 'patient-a', 'ordonnance'],
    ['own-upload', null, 'patient-a', 'patient-a', 'ordonnance'],
    ['other-upload', null, 'patient-b', 'patient-b', 'ordonnance'],
    ['profile', null, null, 'patient-a', 'carte_vitale'],
    ['clinical-photo', 'own', null, 'nurse', 'care_photo'],
] as [$id, $appointment, $patient, $author, $type]) {
    $insert->execute([$id, $appointment, $patient, $author, 'fixture.pdf', 'application/pdf', $type, '2026-09-15']);
}
$db->exec("INSERT INTO patient_documents VALUES ('profile', 'patient-a')");
$rows = PatientDocumentLibrary::list($db, 'patient-a');
$ids = array_column($rows, 'id');
sort($ids);
if ($ids !== ['own-appointment', 'own-upload', 'profile']) throw new RuntimeException('Document owner isolation failed');
$permissions = array_column($rows, 'can_delete', 'id');
if ((int) $permissions['own-appointment'] !== 0 || (int) $permissions['own-upload'] !== 1) throw new RuntimeException('Document deletion permission mismatch');
if (array_key_exists('file_dek', $rows[0]) || array_key_exists('file_path', $rows[0])) throw new RuntimeException('Private storage data exposed');
if (PatientDocumentLibrary::list($db, 'unknown-patient') !== []) throw new RuntimeException('Unknown patient received records');
echo "4 document library checks passed\n";
