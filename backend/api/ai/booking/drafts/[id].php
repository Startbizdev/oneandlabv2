<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiBookingService.php';

ai_handle_options(['GET', 'PATCH', 'OPTIONS']);
$user = ai_require_user(AiBookingAccess::ROLES);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400);
}

$service = new AiBookingService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $draft = $service->getDraft($id, (string) $user['user_id']);
    if (!$draft) {
        ai_json_error('Brouillon introuvable', 404);
    }
    ai_json_response(['success' => true, 'data' => $draft]);
}

if ($method === 'PATCH') {
    $input = ai_read_json_body();
    $patch = is_array($input['payload'] ?? null) ? $input['payload'] : $input;
    try {
        $draft = $service->patchDraft($id, $user, $patch);
    } catch (HttpStatusException $e) {
        ai_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
    } catch (InvalidArgumentException $e) {
        ai_json_error($e->getMessage(), 400, 'VALIDATION_ERROR');
    } catch (Throwable $e) {
        ApiServerError::respond('ai/booking/drafts ' . $id . ' user=' . $user['user_id'], $e, 'Le brouillon de rendez-vous n’a pas pu être mis à jour. Réessayez plus tard.');
        exit;
    }
    if (!$draft) {
        ai_json_error('Brouillon introuvable', 404);
    }
    ai_json_response(['success' => true, 'data' => $draft]);
}

ai_json_error('Méthode non autorisée', 405);
