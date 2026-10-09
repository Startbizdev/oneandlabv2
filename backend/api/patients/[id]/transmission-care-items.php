<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/PatientTransmissionService.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../lib/ApiServerError.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_record_require_user(['nurse', 'pro']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    health_json_error('Méthode non autorisée', 405);
}

$notifications = new NotificationService();
$service = new PatientTransmissionService(fn (...$args) => $notifications->createNotification(...$args));

try {
    health_json_response([
        'success' => true,
        'data' => $service->careItemsForDate($user, $patientId, trim((string) ($_GET['date'] ?? ''))),
    ]);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (HttpStatusException $e) {
    health_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    ApiServerError::respond('soins transmission patient=' . $patientId . ' user=' . ($user['user_id'] ?? ''), $e, 'Soins indisponibles. Réessayez plus tard.');
}
