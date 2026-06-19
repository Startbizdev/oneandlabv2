<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../lib/ai/AiQuickSuggestionsService.php';
require_once __DIR__ . '/../../lib/ai/AIGateway.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur', 'super_admin']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ai_json_error('Méthode non autorisée', 405);
}

$patientId = isset($_GET['patient_id']) ? trim((string) $_GET['patient_id']) : null;
if ($patientId === '') {
    $patientId = null;
}

$service = new AiQuickSuggestionsService();
$gateway = new AIGateway();

ai_json_response([
    'success' => true,
    'data' => [
        'suggestions' => $service->suggestionsForUser($user, $patientId),
        'disclaimer' => $gateway->getDisclaimerPublic(),
    ],
]);
