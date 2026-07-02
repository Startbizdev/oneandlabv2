<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-passage/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-passage/NursePassageSeriesService.php';

nurse_passage_handle_options(['POST', 'OPTIONS']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    nurse_passage_json_error('Méthode non autorisée', 405);
}
CSRFMiddleware::handle();
$user = nurse_passage_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');

$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/nurse/passages/series/([a-f0-9-]{36})/materialize#i', $uri, $m)) {
        $id = $m[1];
    }
}
if ($id === '') {
    nurse_passage_json_error('series id requis', 400);
}

try {
    $service = new NursePassageSeriesService();
    nurse_passage_json_response([
        'success' => true,
        'data' => $service->materialize($id, $nurseId),
    ]);
} catch (RuntimeException $e) {
    nurse_passage_json_error($e->getMessage(), 404);
} catch (Throwable $e) {
    error_log('[nurse/passages/series/materialize] ' . $e->getMessage());
    nurse_passage_json_error('Materialize impossible', 500);
}
