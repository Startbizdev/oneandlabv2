<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-tour/PatientAbsenceService.php';

nurse_tour_handle_options(['GET', 'POST', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$actorId = $nurseId;

$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/nurse/patients/([a-f0-9-]{36})/absences#i', $uri, $m)) {
        $patientId = $m[1];
    }
}
if ($patientId === '') {
    nurse_tour_json_error('patient_id requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$service = new PatientAbsenceService();

try {
    if ($method === 'GET') {
        $activeOnly = isset($_GET['active']) && (string) $_GET['active'] === '1';
        nurse_tour_json_response([
            'success' => true,
            'data' => $service->listForPatient($nurseId, $patientId, $activeOnly),
        ]);
    }

    if ($method === 'POST') {
        CSRFMiddleware::handle();
        $body = nurse_tour_read_json_body();
        nurse_tour_json_response([
            'success' => true,
            'data' => $service->create($nurseId, $patientId, $actorId, $body),
        ], 201);
    }

    nurse_tour_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    nurse_tour_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    nurse_tour_json_error($e->getMessage(), 403);
} catch (Throwable $e) {
    error_log('[nurse/patients/absences] ' . $e->getMessage());
    nurse_tour_json_error('Absence patient indisponible', 500);
}
