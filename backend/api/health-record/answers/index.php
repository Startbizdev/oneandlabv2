<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthRecordService.php';

health_handle_options(['PATCH', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    health_json_error('Méthode non autorisée', 405);
}

$input = health_read_json_body();
$answers = is_array($input['answers'] ?? null) ? $input['answers'] : $input;
if (!is_array($answers) || $answers === []) {
    health_json_error('answers requis', 400);
}

$service = new HealthRecordService();
$recap = $service->upsertAnswers((string) $user['user_id'], $answers);

health_json_response(['success' => true, 'data' => $recap]);
