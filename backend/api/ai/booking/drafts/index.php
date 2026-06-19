<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiBookingService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$input = ai_read_json_body();
$service = new AiBookingService();

try {
    $draft = $service->createDraft($user, $input);
    ai_json_response(['success' => true, 'data' => $draft], 201);
} catch (Throwable $e) {
    ai_json_error($e->getMessage(), 400);
}
