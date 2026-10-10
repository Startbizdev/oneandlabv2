<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiReportService.php';
require_once __DIR__ . '/../../../lib/ai/AiChatRateLimit.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(AiReportService::ROLES);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    AiChatRateLimit::assertAllowed($user, 'analyze');
    $report = (new AiReportService())->createFromDictation($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $report], 201);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/reports/dictate user=' . $user['user_id']);
}
