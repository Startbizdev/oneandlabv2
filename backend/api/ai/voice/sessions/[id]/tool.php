<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../../lib/ai/VoiceRealtimeService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/voice/sessions/([a-f0-9-]{36})/tool#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('session id requis', 400);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$input = ai_read_json_body();
$toolName = trim((string) ($input['name'] ?? $input['tool'] ?? ''));
$arguments = is_array($input['arguments'] ?? null) ? $input['arguments'] : [];

if ($toolName === '') {
    ai_json_error('name requis', 400);
}

try {
    $service = new VoiceRealtimeService();
    $result = $service->executeTool($user, (string) $id, $toolName, $arguments);
    ai_json_response(['success' => true, 'data' => $result]);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    $code = $e->getCode();
    ai_json_error($e->getMessage(), is_int($code) && $code >= 400 && $code < 600 ? $code : 400);
} catch (Throwable $e) {
    ai_json_error($e->getMessage(), 500);
}
