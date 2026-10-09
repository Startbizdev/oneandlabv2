<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiSearchService.php';
require_once __DIR__ . '/../../../lib/ai/AiChatRateLimit.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_assistant_user();

try {
    AiChatRateLimit::assertAllowed($user, 'search');
    $q = trim((string) ($_GET['q'] ?? ''));
    ai_json_response(['success' => true, 'data' => (new AiSearchService())->search((string) $user['user_id'], $q)]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/search');
}
