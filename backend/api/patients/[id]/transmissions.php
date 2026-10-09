<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/PatientTransmissionService.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../lib/ApiServerError.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';

health_handle_options(['GET', 'POST', 'PATCH', 'OPTIONS']);
CSRFMiddleware::handle();
$user = health_record_require_user(['nurse', 'pro', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$notifications = new NotificationService();
$service = new PatientTransmissionService(fn (...$args) => $notifications->createNotification(...$args));

try {
    if ($method === 'GET') {
        $before = trim((string) ($_GET['before'] ?? ''));
        $days = isset($_GET['days']) ? (int) $_GET['days'] : 14;
        health_json_response([
            'success' => true,
            'data' => $service->list($user, $patientId, $before !== '' ? $before : null, $days),
        ]);
    }

    if ($method === 'POST') {
        health_json_response(['success' => true, 'data' => $service->create($user, $patientId, health_read_json_body())], 201);
    }

    if ($method === 'PATCH') {
        $transmissionId = trim((string) ($_GET['transmission_id'] ?? ''));
        if ($transmissionId === '') {
            health_json_error('transmission_id requis', 400);
        }
        health_json_response([
            'success' => true,
            'data' => $service->update($user, $patientId, $transmissionId, health_read_json_body()),
        ]);
    }

    health_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (HttpStatusException $e) {
    health_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    ApiServerError::respond('transmissions patient=' . $patientId . ' user=' . ($user['user_id'] ?? ''), $e, 'Transmissions indisponibles. Réessayez plus tard.');
}
