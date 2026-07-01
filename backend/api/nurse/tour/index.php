<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../lib/nurse-tour/NurseTourService.php';

nurse_tour_handle_options(['GET', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$date = nurse_tour_parse_date($_GET['date'] ?? null);

$origin = null;
if (isset($_GET['lat'], $_GET['lng']) && is_numeric($_GET['lat']) && is_numeric($_GET['lng'])) {
    $origin = ['lat' => (float) $_GET['lat'], 'lng' => (float) $_GET['lng']];
}

try {
    $service = new NurseTourService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->getTour($nurseId, $date, $origin),
    ]);
} catch (Throwable $e) {
    error_log('[nurse/tour] ' . $e->getMessage());
    nurse_tour_json_error('Tournée indisponible', 500);
}
