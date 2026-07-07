<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/preleveur-tour/bootstrap.php';
require_once __DIR__ . '/../../../lib/preleveur-tour/PreleveurTourService.php';

preleveur_tour_handle_options(['GET', 'OPTIONS']);
$user = preleveur_tour_require_preleveur();
$preleveurId = (string) ($user['user_id'] ?? '');
$date = preleveur_tour_parse_date($_GET['date'] ?? null);

$origin = null;
if (isset($_GET['lat'], $_GET['lng']) && is_numeric($_GET['lat']) && is_numeric($_GET['lng'])) {
    $origin = ['lat' => (float) $_GET['lat'], 'lng' => (float) $_GET['lng']];
}

try {
    $service = new PreleveurTourService();
    preleveur_tour_json_response([
        'success' => true,
        'data' => $service->getTour($preleveurId, $date, $origin),
    ]);
} catch (Throwable $e) {
    error_log('[preleveur/tour] ' . $e->getMessage());
    preleveur_tour_json_error('Tournée indisponible', 500);
}
