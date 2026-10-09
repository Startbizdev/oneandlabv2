<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiReportService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(AiReportService::ROLES);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400, 'VALIDATION_ERROR');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    ai_json_response(['success' => true, 'data' => (new AiReportService())->validate($id, (string) $user['user_id'])]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/reports/validate ' . $id . ' user=' . $user['user_id']);
}
