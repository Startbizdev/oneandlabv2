<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-tour/TourVisitService.php';

nurse_tour_handle_options(['POST', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nurse_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$stopId = trim((string) ($_GET['id'] ?? ''));
if ($stopId === '') {
    nurse_tour_json_error('Stop requis', 400);
}
$body = nurse_tour_read_json_body();
$status = trim((string) ($body['status'] ?? ''));
$skipReason = isset($body['skip_reason']) ? trim((string) $body['skip_reason']) : null;
$finalizeAppointment = !empty($body['finalize_appointment']);

try {
    $service = new TourVisitService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->updateStopStatus($nurseId, $stopId, $status, $skipReason, $finalizeAppointment),
    ]);
} catch (InvalidArgumentException $e) {
    nurse_tour_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('[nurse/tour/stops/status] ' . $e->getMessage());
    nurse_tour_json_error('Mise à jour statut impossible', 500);
}
