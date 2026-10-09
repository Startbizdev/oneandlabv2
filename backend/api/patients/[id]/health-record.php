<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthRecordService.php';
require_once __DIR__ . '/../../../lib/ApiServerError.php';

health_handle_options(['GET', 'PATCH', 'OPTIONS']);
// patient : uniquement le dossier d'un de ses proches (vérifié par HealthRecordService).
$user = health_record_require_user(['patient', 'nurse', 'pro', 'lab', 'subaccount', 'preleveur', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'PATCH') {
    $input = health_read_json_body();
    $answers = is_array($input['answers'] ?? null) ? $input['answers'] : $input;
    if (!is_array($answers) || $answers === []) {
        health_json_error('answers requis', 400);
    }
    try {
        $service = new HealthRecordService();
        $data = $service->upsertAnswersForViewer($user, $patientId, $answers);
        health_json_response(['success' => true, 'data' => $data]);
    } catch (PDOException $e) {
        ApiServerError::respond('PATCH carnet patient ' . $patientId . ' user=' . $user['user_id'], $e);
        exit;
    } catch (RuntimeException $e) {
        health_json_error($e->getMessage(), 403);
    }
}

if ($method !== 'GET') {
    health_json_error('Méthode non autorisée', 405);
}

try {
    $service = new HealthRecordService();
    $data = $service->getRecapForViewer($user, $patientId);
    health_json_response(['success' => true, 'data' => $data]);
} catch (PDOException $e) {
    ApiServerError::respond('GET carnet patient ' . $patientId . ' user=' . $user['user_id'], $e);
    exit;
} catch (RuntimeException $e) {
    health_json_error($e->getMessage(), 403);
}
