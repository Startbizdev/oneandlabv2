<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../../lib/ai/AiBookingService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(AiBookingAccess::ROLES);
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
} catch (HttpStatusException $e) {
    ai_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (InvalidArgumentException | DomainException $e) {
    ai_json_error($e->getMessage(), 400, 'VALIDATION_ERROR');
} catch (Throwable $e) {
    ApiServerError::respond('ai/booking/confirm user=' . $user['user_id'], $e, 'La confirmation du rendez-vous a échoué. Réessayez plus tard.');
}
