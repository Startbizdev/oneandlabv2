<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/preleveur-tour/bootstrap.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/preleveur-tour/PreleveurTourService.php';

preleveur_tour_handle_options(['PATCH', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    preleveur_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = preleveur_tour_require_preleveur();
$preleveurId = (string) ($user['user_id'] ?? '');
$body = preleveur_tour_read_json_body();
$date = preleveur_tour_parse_date((string) ($body['date'] ?? ''));
$ids = $body['appointment_ids'] ?? [];
if (!is_array($ids)) {
    preleveur_tour_json_error('appointment_ids requis', 400);
}

try {
    $service = new PreleveurTourService();
    preleveur_tour_json_response([
        'success' => true,
        'data' => $service->saveManualOrder($preleveurId, $date, array_map('strval', $ids)),
    ]);
} catch (Throwable $e) {
    error_log('[preleveur/tour/order] ' . $e->getMessage());
    preleveur_tour_json_error('Enregistrement ordre impossible', 500);
}
