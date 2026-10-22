<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/assistant/bootstrap.php';
require_once __DIR__ . '/../../../lib/assistant/AssistantConversationRepository.php';

assistant_handle_options(['GET', 'OPTIONS']);
$user = assistant_require_user();
$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = max(1, min(50, (int) ($_GET['limit'] ?? 20)));
try {
    $result = (new AssistantConversationRepository(assistant_db()))->listForUser((string) $user['user_id'], $page, $limit);
} catch (Throwable $e) {
    assistant_respond_error($e, 'assistant/conversations');
}
assistant_json_response([
    'success' => true,
    'data' => $result['items'],
    'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $result['total'], 'pages' => (int) ceil($result['total'] / $limit)],
]);
