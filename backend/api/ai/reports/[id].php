<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiReportService.php';

ai_handle_options(['PATCH', 'OPTIONS']);
$user = ai_require_user(AiReportService::ROLES);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400, 'VALIDATION_ERROR');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    $body = ai_read_json_body();
    $report = (new AiReportService())->updateDraftText($id, (string) $user['user_id'], $body['content_text'] ?? null);
    ai_json_response(['success' => true, 'data' => $report]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/reports/update ' . $id . ' user=' . $user['user_id']);
}
