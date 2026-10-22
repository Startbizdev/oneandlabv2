<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/assistant/AssistantDictationService.php';

assistant_handle_options(['POST', 'OPTIONS']);
$user = assistant_require_user(ASSISTANT_STAFF_ROLES);
try {
    $text = (new AssistantDictationService(assistant_db()))->format($user, assistant_read_json_body());
} catch (Throwable $e) {
    assistant_respond_error($e, 'assistant/dictation');
}
assistant_json_response(['success' => true, 'data' => ['text' => $text]]);
