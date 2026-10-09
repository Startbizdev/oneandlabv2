<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../lib/ai/AiChatService.php';
require_once __DIR__ . '/../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../lib/Uuid.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_assistant_user();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    AiChatRateLimit::assertAllowed($user, 'chat');
    $user['request_id'] = Uuid::v4();
    $result = (new AiChatService())->handleMessage($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $result]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/chat');
}
