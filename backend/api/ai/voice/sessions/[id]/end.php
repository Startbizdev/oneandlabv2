<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../../lib/ai/VoiceService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_assistant_user();

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/voice/sessions/([a-f0-9-]{36})/end#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('session id requis', 400, 'VALIDATION_ERROR');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    $service = new VoiceService();
    if ($service->getSession((string) $id, (string) $user['user_id']) === null) {
        throw HttpStatusException::notFound('Session vocale introuvable');
    }
    $service->endSession((string) $id, (string) $user['user_id']);
    ai_json_response(['success' => true, 'data' => null]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/voice/sessions/end');
}
