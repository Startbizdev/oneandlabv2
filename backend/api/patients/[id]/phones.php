<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/PatientPhoneService.php';

health_handle_options(['GET', 'POST', 'DELETE', 'OPTIONS']);
$user = health_record_require_user(['patient', 'nurse', 'pro', 'lab', 'subaccount', 'preleveur', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$service = new PatientPhoneService();

try {
    if ($method === 'GET') {
        health_json_response(['success' => true, 'data' => $service->listForPatient($user, $patientId)]);
    }

    if ($method === 'POST') {
        $row = $service->create($user, $patientId, health_read_json_body());
        health_json_response(['success' => true, 'data' => $row], 201);
    }

    if ($method === 'DELETE') {
        $phoneId = trim((string) ($_GET['phone_id'] ?? ''));
        if ($phoneId === '') {
            health_json_error('phone_id requis', 400);
        }
        $service->delete($user, $patientId, $phoneId);
        health_json_response(['success' => true]);
    }

    health_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (HttpStatusException $e) {
    health_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    ApiServerError::respond('téléphones patient=' . $patientId . ' user=' . ($user['user_id'] ?? ''), $e, 'Numéros indisponibles. Réessayez plus tard.');
}
