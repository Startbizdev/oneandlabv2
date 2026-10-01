<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiBookingService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(AiBookingAccess::ROLES);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$input = ai_read_json_body();
$service = new AiBookingService();

try {
    $draft = $service->createDraft($user, $input);
    ai_json_response(['success' => true, 'data' => $draft], 201);
} catch (HttpStatusException $e) {
    ai_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400, 'VALIDATION_ERROR');
} catch (Throwable $e) {
    ApiServerError::respond('ai/booking/drafts création user=' . $user['user_id'], $e, 'Le brouillon de rendez-vous n’a pas pu être créé. Réessayez plus tard.');
}
