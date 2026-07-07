<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/preleveur-tour/bootstrap.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/preleveur-tour/PreleveurTourService.php';

preleveur_tour_handle_options(['POST', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    preleveur_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = preleveur_tour_require_preleveur();
$preleveurId = (string) ($user['user_id'] ?? '');
$body = preleveur_tour_read_json_body();
$date = preleveur_tour_parse_date((string) ($body['date'] ?? ''));
$mode = (string) ($body['mode'] ?? 'smart');
$force = (bool) ($body['force'] ?? false);
$origin = null;
if (isset($body['lat'], $body['lng']) && is_numeric($body['lat']) && is_numeric($body['lng'])) {
    $origin = ['lat' => (float) $body['lat'], 'lng' => (float) $body['lng']];
}

try {
    $service = new PreleveurTourService();
    preleveur_tour_json_response([
        'success' => true,
        'data' => $service->optimize($preleveurId, $date, $mode, $force, $origin),
    ]);
} catch (RuntimeException $e) {
    preleveur_tour_json_error($e->getMessage(), 409, 'manual_order_locked');
} catch (Throwable $e) {
    error_log('[preleveur/tour/optimize] ' . $e->getMessage());
    preleveur_tour_json_error('Optimisation impossible', 500);
}
