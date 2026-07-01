<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/TrendEngine.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient']);

$engine = new TrendEngine();
if (isset($_GET['refresh']) && $_GET['refresh'] === '1') {
    $engine->computeForPatient((string) $user['user_id']);
}
ai_json_response(['success' => true, 'data' => $engine->listForUser($user)]);
