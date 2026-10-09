<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/nurse-collaboration/NurseCollaborationService.php';

nurse_tour_handle_options(['GET', 'POST', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$service = new NurseCollaborationService(nurse_tour_db());

try {
    if ($method === 'GET') {
        $appointmentId = trim((string) ($_GET['appointment_id'] ?? ''));
        nurse_tour_json_response([
            'success' => true,
            'data' => $service->listFor($nurseId, $appointmentId !== '' ? $appointmentId : null),
        ]);
    }

    if ($method === 'POST') {
        CSRFMiddleware::handle();
        nurse_tour_json_response([
            'success' => true,
            'data' => $service->create($nurseId, nurse_tour_read_json_body()),
        ], 201);
    }

    nurse_tour_json_error('Méthode non autorisée', 405);
} catch (HttpStatusException $e) {
    nurse_tour_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    error_log('[nurse/collaborations] ' . $e->getMessage());
    nurse_tour_json_error('Binômes indisponibles', 500);
}
