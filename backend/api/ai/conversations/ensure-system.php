<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiConversationService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_assistant_user();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    $input = ai_read_json_body();
    $systemKey = trim((string) ($input['system_key'] ?? 'assistant_health'));
    $conv = (new AiConversationService())->ensureSystem($user, $systemKey);
    ai_json_response(['success' => true, 'data' => $conv]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/conversations/ensure-system');
}
