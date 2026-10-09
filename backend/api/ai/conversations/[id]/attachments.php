<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiAttachmentService.php';

ai_handle_options(['GET', 'POST', 'OPTIONS']);
$user = ai_require_assistant_user();

$conversationId = $_GET['id'] ?? null;
if (!$conversationId) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/conversations/([a-f0-9-]{36})/attachments#i', $uri, $m)) {
        $conversationId = $m[1];
    }
}
if (!$conversationId) {
    ai_json_error('conversation_id requis', 400, 'VALIDATION_ERROR');
}

$service = new AiAttachmentService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $items = $service->listForConversation((string) $conversationId, (string) $user['user_id']);
        ai_json_response(['success' => true, 'data' => $items]);
    }
    if ($method === 'POST') {
        $body = ai_read_json_body();
        $attachment = $service->attachToConversation($user, (string) $conversationId, $body);
        ai_json_response(['success' => true, 'data' => $attachment], 201);
    }
    ai_json_error('Méthode non autorisée', 405);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/conversations/attachments');
}
