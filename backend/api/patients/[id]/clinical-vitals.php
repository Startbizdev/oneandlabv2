<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/ClinicalVitalService.php';

health_handle_options(['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
$user = health_record_require_user(['nurse', 'pro', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$service = new ClinicalVitalService();

try {
    if ($method === 'GET') {
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        $vitalType = trim((string) ($_GET['vital_type'] ?? ''));
        if ($vitalType !== '') {
            $data = $service->historyForType($user, $patientId, $vitalType, $limit);
            health_json_response(['success' => true, 'data' => $data]);
        }
        $data = $service->listForStaff($user, $patientId, $limit);
        health_json_response(['success' => true, 'data' => $data]);
    }

    if ($method === 'POST') {
        $input = health_read_json_body();
        $row = $service->create($user, $patientId, $input);
        health_json_response(['success' => true, 'data' => $row], 201);
    }

    if ($method === 'PATCH') {
        $vitalId = trim((string) ($_GET['vital_id'] ?? ''));
        if ($vitalId === '') {
            health_json_error('vital_id requis', 400);
        }
        $input = health_read_json_body();
        $row = $service->update($user, $patientId, $vitalId, $input);
        health_json_response(['success' => true, 'data' => $row]);
    }

    if ($method === 'DELETE') {
        $vitalId = trim((string) ($_GET['vital_id'] ?? ''));
        if ($vitalId === '') {
            health_json_error('vital_id requis', 400);
        }
        $service->delete($user, $patientId, $vitalId);
        health_json_response(['success' => true]);
    }

    health_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    $code = str_contains($e->getMessage(), 'refusé') || str_contains($e->getMessage(), 'réservé') ? 403 : 404;
    health_json_error($e->getMessage(), $code);
}
