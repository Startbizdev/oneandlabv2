<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiSearchService.php';
require_once __DIR__ . '/../../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../../lib/ai/AiUserFacingError.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

try {
    AiChatRateLimit::assertAllowed($user, 'search');
} catch (RuntimeException $e) {
    ai_json_error(AiUserFacingError::fromThrowable($e), (int) ($e->getCode() ?: 429));
}

$q = trim((string) ($_GET['q'] ?? ''));
$service = new AiSearchService();
ai_json_response(['success' => true, 'data' => $service->search((string) $user['user_id'], $q)]);
