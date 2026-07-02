<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../../lib/ai/VoiceService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/voice/sessions/([a-f0-9-]{36})/turn#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('session id requis', 400);
}

$service = new VoiceService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

try {
    if (str_ends_with(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '', '/end')) {
        $service->endSession((string) $id, (string) $user['user_id']);
        ai_json_response(['success' => true, 'data' => null]);
    }
    $result = $service->processTurn($user, (string) $id, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $result]);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    ai_json_error($e->getMessage(), 500);
}
