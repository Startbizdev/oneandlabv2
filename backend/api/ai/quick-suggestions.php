<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../lib/ai/AiQuickSuggestionsService.php';
require_once __DIR__ . '/../../lib/ai/AIGateway.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_assistant_user();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ai_json_error('Méthode non autorisée', 405);
}

$patientId = isset($_GET['patient_id']) ? trim((string) $_GET['patient_id']) : null;
if ($patientId === '') {
    $patientId = null;
}

try {
    ai_json_response([
        'success' => true,
        'data' => [
            'suggestions' => (new AiQuickSuggestionsService())->suggestionsForUser($user, $patientId),
            'disclaimer' => (new AIGateway())->getDisclaimerPublic(),
        ],
    ]);
} catch (Throwable $e) {
    ai_respond_error($e, 'ai/quick-suggestions');
}
