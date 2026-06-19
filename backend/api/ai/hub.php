<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../lib/ai/AIGateway.php';
require_once __DIR__ . '/../../lib/ai/AiQuickSuggestionsService.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ai_json_error('Méthode non autorisée', 405);
}

$gateway = new AIGateway();
$suggestions = new AiQuickSuggestionsService();

ai_json_response([
    'success' => true,
    'data' => [
        'role' => $user['role'] ?? null,
        'disclaimer' => $gateway->getDisclaimerPublic(),
        'quick_suggestions' => $suggestions->suggestionsForUser($user),
    ],
]);
