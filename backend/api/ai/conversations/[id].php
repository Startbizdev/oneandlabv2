<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiConversationService.php';
require_once __DIR__ . '/../../../lib/ai/AiBookingService.php';

ai_handle_options(['GET', 'PATCH', 'DELETE', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400);
}

$service = new AiConversationService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $conv = $service->getById($id, (string) $user['user_id']);
    if (!$conv) {
        ai_json_error('Conversation introuvable', 404);
    }
    $messages = $service->getMessages($id, (string) $user['user_id']);
    $booking = new AiBookingService();
    $userId = (string) $user['user_id'];
    foreach ($messages as $i => $msg) {
        $draftId = is_array($msg['metadata']['draft'] ?? null)
            ? trim((string) ($msg['metadata']['draft']['id'] ?? ''))
            : '';
        if ($draftId === '') {
            continue;
        }
        $liveDraft = $booking->getDraft($draftId, $userId);
        if ($liveDraft !== null) {
            $messages[$i]['metadata']['draft'] = $liveDraft;
        }
    }
    $draft = $booking->getLatestDraftForConversation($id, $userId);
    ai_json_response(['success' => true, 'data' => ['conversation' => $conv, 'messages' => $messages, 'draft' => $draft]]);
}

if ($method === 'PATCH') {
    $input = ai_read_json_body();
    $conv = $service->update($id, (string) $user['user_id'], $input);
    if (!$conv) {
        ai_json_error('Conversation introuvable', 404);
    }
    ai_json_response(['success' => true, 'data' => $conv]);
}

if ($method === 'DELETE') {
    if (!$service->softDelete($id, (string) $user['user_id'])) {
        ai_json_error('Conversation introuvable', 404);
    }
    ai_json_response(['success' => true]);
}

ai_json_error('Méthode non autorisée', 405);
