<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/nurse-tour/NurseTourService.php';

nurse_tour_handle_options(['POST', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nurse_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$body = nurse_tour_read_json_body();
$date = nurse_tour_parse_date((string) ($body['date'] ?? ''));
$mode = (string) ($body['mode'] ?? 'smart');
$force = (bool) ($body['force'] ?? false);
$origin = null;
if (isset($body['lat'], $body['lng']) && is_numeric($body['lat']) && is_numeric($body['lng'])) {
    $origin = ['lat' => (float) $body['lat'], 'lng' => (float) $body['lng']];
}

try {
    $service = new NurseTourService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->optimize($nurseId, $date, $mode, $force, $origin),
    ]);
} catch (RuntimeException $e) {
    nurse_tour_json_error($e->getMessage(), 409, 'manual_order_locked');
} catch (Throwable $e) {
    error_log('[nurse/tour/optimize] ' . $e->getMessage());
    nurse_tour_json_error('Optimisation impossible', 500);
}
