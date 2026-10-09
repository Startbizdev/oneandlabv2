<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/rag/AiDocumentJobService.php';
require_once __DIR__ . '/../../../../lib/ai/AiAttachmentService.php';
require_once __DIR__ . '/../../../../lib/ai/AiChatRateLimit.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_assistant_user();

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
    ai_json_error('ID document requis', 400, 'VALIDATION_ERROR');
}

try {
    AiChatRateLimit::assertAllowed($user, 'analyze');
    $doc = (new AiAttachmentService())->requireAccessibleDocument($user, (string) $id);
    $patientId = (string) ($doc['patient_id'] ?? $user['user_id']);
    $summaryId = (new AiDocumentJobService(ai_db()))->queueDocument($patientId, (string) $id, 'document_analysis');
    ai_json_response([
        'success' => true,
        'data' => ['summary_job_id' => $summaryId, 'status' => 'pending'],
    ], 202);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/documents/analyze');
}
