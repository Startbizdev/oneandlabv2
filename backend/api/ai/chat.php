<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../lib/ai/AiChatService.php';
require_once __DIR__ . '/../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../lib/ai/AiUserFacingError.php';
require_once __DIR__ . '/../../lib/Uuid.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    AiChatRateLimit::assertAllowed($user, 'chat');
} catch (RuntimeException $e) {
    ai_json_error(AiUserFacingError::fromThrowable($e), (int) ($e->getCode() ?: 429));
}

$input = ai_read_json_body();
$user['request_id'] = Uuid::v4();
$service = new AiChatService();

try {
    $result = $service->handleMessage($user, $input);
    ai_json_response(['success' => true, 'data' => $result]);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400, 'VALIDATION_ERROR');
} catch (Throwable $e) {
    error_log('ai/chat: ' . $e->getMessage());
    ai_json_error(AiUserFacingError::fromThrowable($e), 500);
}
