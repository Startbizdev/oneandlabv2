<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-tour/PatientAbsenceService.php';

nurse_tour_handle_options(['PATCH', 'DELETE', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');

$patientId = trim((string) ($_GET['id'] ?? ''));
$absenceId = trim((string) ($_GET['absenceId'] ?? ''));
$uri = $_SERVER['REQUEST_URI'] ?? '';
if ($patientId === '' && preg_match('#/nurse/patients/([a-f0-9-]{36})/absences#i', $uri, $m)) {
    $patientId = $m[1];
}
if ($absenceId === '' && preg_match('#/nurse/patients/[a-f0-9-]{36}/absences/([a-f0-9-]{36})#i', $uri, $m)) {
    $absenceId = $m[1];
}
if ($patientId === '' || $absenceId === '') {
    nurse_tour_json_error('patient_id et absence_id requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'PATCH';
$service = new PatientAbsenceService();

try {
    if ($method === 'PATCH') {
        CSRFMiddleware::handle();
        $body = nurse_tour_read_json_body();
        nurse_tour_json_response([
            'success' => true,
            'data' => $service->update($nurseId, $patientId, $absenceId, $body),
        ]);
    }

    if ($method === 'DELETE') {
        CSRFMiddleware::handle();
        $service->delete($nurseId, $patientId, $absenceId);
        nurse_tour_json_response(['success' => true]);
    }

    nurse_tour_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    nurse_tour_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    nurse_tour_json_error($e->getMessage(), 403);
} catch (Throwable $e) {
    error_log('[nurse/patients/absences/id] ' . $e->getMessage());
    nurse_tour_json_error('Absence patient indisponible', 500);
}
