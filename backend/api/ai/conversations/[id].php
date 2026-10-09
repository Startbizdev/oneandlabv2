<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiConversationService.php';
require_once __DIR__ . '/../../../lib/ai/AiBookingService.php';
require_once __DIR__ . '/../../../lib/ai/AiAttachmentService.php';

ai_handle_options(['GET', 'PATCH', 'DELETE', 'OPTIONS']);
$user = ai_require_assistant_user();
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400, 'VALIDATION_ERROR');
}

$service = new AiConversationService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$userId = (string) $user['user_id'];

try {
    if ($method === 'GET') {
        $limitParam = $_GET['limit'] ?? null;
        if ($limitParam !== null && !ctype_digit((string) $limitParam)) {
            throw new InvalidArgumentException('limit doit être un entier positif');
        }
        $before = trim((string) ($_GET['before'] ?? ''));
        $page = $service->getHistoryPage(
            $id,
            $userId,
            $limitParam !== null ? (int) $limitParam : null,
            $before !== '' ? $before : null,
        );
        $conv = $service->getById($id, $userId);
        $messages = (new AiAttachmentService())->enrichMessagesWithAttachments($id, $userId, $page['messages']);
        $booking = new AiBookingService();
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
        ai_json_response(['success' => true, 'data' => [
            'conversation' => $conv,
            'messages' => $messages,
            'has_more' => $page['has_more'],
            'draft' => $booking->getLatestDraftForConversation($id, $userId),
        ]]);
    }

    if ($method === 'PATCH') {
        $conv = $service->update($id, $userId, ai_read_json_body());
        if (!$conv) {
            ai_json_error('Conversation introuvable', 404, 'NOT_FOUND');
        }
        ai_json_response(['success' => true, 'data' => $conv]);
    }

    if ($method === 'DELETE') {
        ai_json_response(['success' => true, 'data' => ['deleted' => $service->deletePermanently($user, $id)]]);
    }
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/conversations/detail');
}

ai_json_error('Méthode non autorisée', 405);
