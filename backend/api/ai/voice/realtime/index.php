<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/VoiceRealtimeService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    $service = new VoiceRealtimeService();
    $payload = $service->startRealtime($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $payload], 201);
} catch (RuntimeException $e) {
    $code = $e->getCode();
    ai_json_error($e->getMessage(), is_int($code) && $code >= 400 && $code < 600 ? $code : 400);
} catch (Throwable $e) {
    ai_json_error($e->getMessage(), 500);
}
