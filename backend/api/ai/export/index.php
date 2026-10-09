<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiExportService.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_assistant_user();

try {
    $data = (new AiExportService())->exportForUser((string) $user['user_id']);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/export');
}
header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="cary-ai-export-' . date('Y-m-d') . '.json"');
echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
