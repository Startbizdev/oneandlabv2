<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/assistant/AssistantChatService.php';

assistant_handle_options(['POST', 'OPTIONS']);
$user = assistant_require_user();
$service = new AssistantChatService(assistant_db());
try {
    $turn = $service->prepare($user, assistant_read_json_body());
} catch (Throwable $e) {
    assistant_respond_error($e, 'assistant/chat');
}

// Le tour est enregistré même si le client coupe le flux : un renvoi du même client_message_id le rejoue.
ignore_user_abort(true);
@set_time_limit(120);
while (ob_get_level() > 0) {
    ob_end_flush();
}
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

$service->run($turn, static function (string $event, array $payload): void {
    echo 'event: ' . $event . "\n" . 'data: ' . json_encode((object) $payload, JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();
});
