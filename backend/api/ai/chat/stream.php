<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiChatService.php';
require_once __DIR__ . '/../../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../../lib/ai/AiUserFacingError.php';
require_once __DIR__ . '/../../../lib/Uuid.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    AiChatRateLimit::assertAllowed($user, 'stream');
} catch (RuntimeException $e) {
    ai_json_error(AiUserFacingError::fromThrowable($e), (int) ($e->getCode() ?: 429));
}

$input = ai_read_json_body();
$user['request_id'] = Uuid::v4();
$service = new AiChatService();

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$send = static function (string $event, array $payload): void {
    echo 'event: ' . $event . "\n";
    echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
    if (function_exists('ob_flush')) {
        @ob_flush();
    }
    flush();
};

try {
    $send('start', ['ok' => true]);
    $result = $service->handleMessage(
        $user,
        $input,
        static function (string $delta) use ($send): void {
            $send('delta', ['text' => $delta]);
        },
        static function (string $event, array $payload) use ($send): void {
            $send($event, $payload);
        },
    );
    $send('done', $result);
    echo "event: end\ndata: {}\n\n";
} catch (Throwable $e) {
    error_log('ai/chat/stream: ' . $e->getMessage());
    $send('error', ['error' => AiUserFacingError::fromThrowable($e)]);
}
