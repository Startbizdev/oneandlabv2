<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../../lib/nurse-tour/TourVisitService.php';

nurse_tour_handle_options(['PATCH', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    nurse_tour_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$stopId = trim((string) ($_GET['id'] ?? ''));
$itemId = trim((string) ($_GET['itemId'] ?? ''));
if ($stopId === '' || $itemId === '') {
    nurse_tour_json_error('Stop et soin requis', 400);
}
$body = nurse_tour_read_json_body();
if (!is_bool($body['done'] ?? null)) {
    nurse_tour_json_error('Champ done (booléen) requis', 400);
}

try {
    $service = new TourVisitService();
    nurse_tour_json_response([
        'success' => true,
        'data' => $service->setItemDone($nurseId, $stopId, $itemId, $body['done']),
    ]);
} catch (InvalidArgumentException $e) {
    nurse_tour_json_error($e->getMessage(), 400);
} catch (HttpStatusException $e) {
    nurse_tour_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    error_log('[nurse/tour/stops/items] ' . $e->getMessage());
    nurse_tour_json_error('Mise à jour du soin impossible', 500);
}
