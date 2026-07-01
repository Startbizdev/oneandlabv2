<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../../lib/health/CareGapActionService.php';

health_handle_options(['POST', 'OPTIONS']);
$user = health_require_patient();
$gapKey = trim((string) ($_GET['key'] ?? ''));
if ($gapKey === '') {
    health_json_error('gap_key requis', 400);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    health_json_error('Méthode non autorisée', 405);
}

$input = health_read_json_body();
$status = (string) ($input['status'] ?? 'clicked');
$actionKey = (string) ($input['action_key'] ?? 'open');
if (!in_array($status, ['clicked', 'dismissed', 'shown'], true)) {
    health_json_error('status invalide', 400);
}

$service = new CareGapActionService();
$result = $service->record((string) $user['user_id'], $gapKey, $actionKey, $status);

health_json_response(['success' => true, 'data' => $result]);
