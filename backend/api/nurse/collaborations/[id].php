<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/nurse-collaboration/NurseCollaborationService.php';

nurse_tour_handle_options(['DELETE', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');

$collaborationId = trim((string) ($_GET['id'] ?? ''));
if ($collaborationId === '' && preg_match('#/nurse/collaborations/([a-f0-9-]{36})#i', $_SERVER['REQUEST_URI'] ?? '', $m)) {
    $collaborationId = $m[1];
}
if ($collaborationId === '') {
    nurse_tour_json_error('Binôme requis', 400);
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'DELETE') {
        CSRFMiddleware::handle();
        (new NurseCollaborationService(nurse_tour_db()))->revoke($nurseId, $collaborationId);
        nurse_tour_json_response(['success' => true]);
    }

    nurse_tour_json_error('Méthode non autorisée', 405);
} catch (HttpStatusException $e) {
    nurse_tour_json_error($e->getMessage(), $e->httpStatus, $e->errorCode);
} catch (Throwable $e) {
    error_log('[nurse/collaborations/id] ' . $e->getMessage());
    nurse_tour_json_error('Binôme indisponible', 500);
}
