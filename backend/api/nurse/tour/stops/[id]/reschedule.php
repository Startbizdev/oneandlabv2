<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-tour/TourVisitService.php';

nurse_tour_handle_options(['PATCH', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
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
$scheduledAt = trim((string) ($body['scheduled_at'] ?? ''));
if ($scheduledAt === '') {
    nurse_tour_json_error('scheduled_at requis', 400);
}
$availability = $body['availability'] ?? null;

try {
    $service = new TourVisitService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->rescheduleStop($nurseId, $stopId, $scheduledAt, $availability),
    ]);
} catch (InvalidArgumentException $e) {
    nurse_tour_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('[nurse/tour/stops/reschedule] ' . $e->getMessage());
    nurse_tour_json_error('Déplacement impossible', 500);
}
