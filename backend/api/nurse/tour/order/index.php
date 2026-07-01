<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/nurse-tour/NurseTourService.php';

nurse_tour_handle_options(['PATCH', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    nurse_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$body = nurse_tour_read_json_body();
$date = nurse_tour_parse_date((string) ($body['date'] ?? ''));
$ids = $body['appointment_ids'] ?? [];
if (!is_array($ids)) {
    nurse_tour_json_error('appointment_ids requis', 400);
}

try {
    $service = new NurseTourService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->saveManualOrder($nurseId, $date, array_map('strval', $ids)),
    ]);
} catch (Throwable $e) {
    error_log('[nurse/tour/order] ' . $e->getMessage());
    nurse_tour_json_error('Enregistrement ordre impossible', 500);
}
