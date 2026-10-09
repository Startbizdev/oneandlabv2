<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiConversationService.php';

ai_handle_options(['GET', 'POST', 'OPTIONS']);
$user = ai_require_assistant_user();
$service = new AiConversationService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
        $archivedOnly = isset($_GET['archived']) && $_GET['archived'] === '1';
        $items = $service->listForUser((string) $user['user_id'], $limit, $offset, $archivedOnly);
        ai_json_response(['success' => true, 'data' => $items]);
    }

    if ($method === 'POST') {
        $result = $service->create($user, ai_read_json_body());
        ai_json_response(['success' => true, 'data' => $result['conversation']], $result['created'] ? 201 : 200);
    }
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/conversations');
}

ai_json_error('Méthode non autorisée', 405);
