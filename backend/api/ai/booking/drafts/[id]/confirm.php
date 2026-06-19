<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../../lib/ai/AiBookingService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse']);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$input = ai_read_json_body();
$service = new AiBookingService();

try {
    $result = $service->confirmDraft($id, $user, is_array($input['payload'] ?? null) ? $input['payload'] : $input);
    ai_json_response(['success' => true, 'data' => $result]);
} catch (RuntimeException $e) {
    $code = str_contains($e->getMessage(), 'email') ? 409 : 400;
    ai_json_error($e->getMessage(), $code);
} catch (Throwable $e) {
    error_log('ai/booking/confirm: ' . $e->getMessage());
    ai_json_error($e->getMessage(), 500);
}
