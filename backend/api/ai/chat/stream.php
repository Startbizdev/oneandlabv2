<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiChatService.php';
require_once __DIR__ . '/../../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../../lib/ai/AiUserFacingError.php';
require_once __DIR__ . '/../../../lib/Uuid.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_assistant_user();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$input = ai_read_json_body();
$service = new AiChatService();
try {
    AiChatRateLimit::assertAllowed($user, 'stream');
    $service->validateRequest($user, $input);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/chat/stream');
}
$user['request_id'] = Uuid::v4();

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$send = static function (string $event, array $payload): void {
    echo 'event: ' . $event . "\n";
    echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
};

$send('start', ['ok' => true]);
try {
    $result = $service->handleMessage(
        $user,
        $input,
        static function (string $delta) use ($send): void {
            $send('delta', ['text' => $delta]);
        },
        static function (string $event, array $payload) use ($send): void {
            $send($event, $payload);
        },
        static function (array $emergency) use ($send): void {
            $send('emergency', $emergency);
        },
    );
    $send('done', $result);
} catch (Throwable $e) {
    $error = AiUserFacingError::describe($e);
    if ($error['status'] >= 500) {
        ApiServerError::log('ai/chat/stream', $e);
    }
    $send('error', array_filter([
        'error' => $error['message'],
        'code' => $error['code'],
        'retry_after' => $error['retry_after'],
    ], static fn (mixed $v): bool => $v !== null));
}
echo "event: end\ndata: {}\n\n";
flush();
