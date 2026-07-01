<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/rag/AiDocumentJobService.php';
require_once __DIR__ . '/../../../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../../../models/User.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/documents/([a-f0-9-]{36})/analyze#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('ID document requis', 400);
}

$db = ai_db();
$userModel = new User();
$stmt = $db->prepare('
    SELECT md.*, COALESCE(md.patient_id, a.patient_id) AS resolved_patient_id
    FROM medical_documents md
    LEFT JOIN appointments a ON a.id = md.appointment_id
    WHERE md.id = ?
    LIMIT 1
');
$stmt->execute([$id]);
$doc = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) {
    ai_json_error('Document introuvable', 404);
}
$patientId = (string) ($doc['resolved_patient_id'] ?? $user['user_id']);
if (!PatientDossierAccess::canAccess($db, $userModel, $user, $patientId)) {
    ai_json_error('Accès refusé', 403);
}

$jobs = new AiDocumentJobService($db);
$summaryId = $jobs->queueDocument($patientId, (string) $id, 'document_analysis');

ai_json_response([
    'success' => true,
    'data' => ['summary_job_id' => $summaryId, 'status' => 'pending'],
], 202);
