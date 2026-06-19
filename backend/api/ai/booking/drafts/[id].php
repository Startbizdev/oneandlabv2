<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiBookingService.php';

ai_handle_options(['GET', 'PATCH', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse']);
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
    $draft = $service->patchDraft($id, $user, $patch);
    if (!$draft) {
        ai_json_error('Brouillon introuvable', 404);
    }
    ai_json_response(['success' => true, 'data' => $draft]);
}

ai_json_error('Méthode non autorisée', 405);
