<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/assistant/bootstrap.php';
require_once __DIR__ . '/../../lib/assistant/AssistantResultsConsent.php';

/** Réglages du patient : lecture de ses résultats par l'assistant (accord révocable). */
assistant_handle_options(['GET', 'PUT', 'OPTIONS']);
$user = assistant_require_user(['patient']);
$userId = (string) $user['user_id'];
$db = assistant_db();
try {
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $body = assistant_read_json_body();
        if (!is_bool($body['results_reading'] ?? null)) {
            assistant_json_error('results_reading doit être un booléen', 400, 'VALIDATION_ERROR');
        }
        $at = AssistantResultsConsent::set($db, $userId, $body['results_reading']);
    } else {
        $at = AssistantResultsConsent::grantedAt($db, $userId);
    }
} catch (Throwable $e) {
    assistant_respond_error($e, 'assistant/settings');
}
assistant_json_response(['success' => true, 'data' => ['results_reading' => $at !== null, 'results_reading_since' => $at]]);
