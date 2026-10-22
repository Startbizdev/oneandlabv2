<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/assistant/bootstrap.php';
require_once __DIR__ . '/../../../lib/assistant/AssistantConversationRepository.php';

assistant_handle_options(['GET', 'DELETE', 'OPTIONS']);
$user = assistant_require_user();
$id = strtolower(trim((string) ($_GET['id'] ?? '')));
$repo = new AssistantConversationRepository(assistant_db());
$conversation = preg_match('/^[0-9a-f-]{36}$/', $id) === 1 ? $repo->find($id, (string) $user['user_id']) : null;
if ($conversation === null) {
    assistant_json_error('Conversation introuvable', 404, 'NOT_FOUND');
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $repo->delete($id, (string) $user['user_id']);
        assistant_json_response(['success' => true]);
    }
    $before = trim((string) ($_GET['before'] ?? ''));
    $page = $repo->messagesPage($id, $before !== '' ? $before : null, max(1, min(100, (int) ($_GET['limit'] ?? 30))));
    $data = ['id' => $id, 'title' => $repo->title($conversation), 'messages' => $page['messages'], 'has_more' => $page['has_more']];
} catch (Throwable $e) {
    assistant_respond_error($e, 'assistant/conversations/detail');
}
assistant_json_response(['success' => true, 'data' => $data]);
