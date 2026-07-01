<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiConversationService.php';

ai_handle_options(['GET', 'POST', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);
$service = new AiConversationService();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
    $archivedOnly = isset($_GET['archived']) && $_GET['archived'] === '1';
    $items = $service->listForUser((string) $user['user_id'], $limit, $offset, $archivedOnly);
    ai_json_response(['success' => true, 'data' => $items]);
}

if ($method === 'POST') {
    $input = ai_read_json_body();
    $conv = $service->create($user, $input);
    ai_json_response(['success' => true, 'data' => $conv], 201);
}

ai_json_error('Méthode non autorisée', 405);
