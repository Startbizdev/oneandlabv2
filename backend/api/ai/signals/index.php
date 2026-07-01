<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiPatientFollowupService.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ai_json_error('Méthode non autorisée', 405);
}

$service = new AiPatientFollowupService();
$signals = $service->listActiveSignals((string) $user['user_id']);
ai_json_response(['success' => true, 'data' => $signals]);
