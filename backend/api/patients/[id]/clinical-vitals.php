<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/ClinicalVitalService.php';

health_handle_options(['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
// patient : lecture seule du dossier d'un de ses proches (vérifiée par ClinicalVitalService).
$user = health_record_require_user($method === 'GET' ? ['patient', 'nurse', 'pro', 'super_admin'] : ['nurse', 'pro', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

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
} catch (HttpStatusException $e) {
    health_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    ApiServerError::respond('constantes cliniques patient=' . $patientId . ' user=' . ($user['user_id'] ?? ''), $e, 'Constantes cliniques indisponibles. Réessayez plus tard.');
}
