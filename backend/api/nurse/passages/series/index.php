<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/nurse-passage/bootstrap.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../lib/nurse-passage/NursePassageSeriesService.php';

nurse_passage_handle_options(['POST', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nurse_passage_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_passage_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$body = nurse_passage_read_json_body();

try {
    $service = new NursePassageSeriesService();
    nurse_passage_json_response([
        'success' => true,
        'data' => $service->create($nurseId, $body),
    ], 201);
} catch (InvalidArgumentException $e) {
    nurse_passage_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    nurse_passage_json_error($e->getMessage(), 403);
} catch (Exception $e) {
    error_log('[nurse/passages/series] ' . $e->getMessage());
    nurse_passage_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('[nurse/passages/series] ' . $e->getMessage());
    nurse_passage_json_error('Création passage impossible', 500);
}
