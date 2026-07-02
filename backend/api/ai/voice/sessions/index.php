<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/VoiceService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

try {
    $service = new VoiceService();
    $session = $service->createSession($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $session], 201);
} catch (Throwable $e) {
    ai_json_error($e->getMessage(), 400);
}
