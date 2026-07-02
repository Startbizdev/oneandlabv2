<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../../lib/nurse-passage/bootstrap.php';
require_once __DIR__ . '/../../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../../lib/nurse-passage/NursePassageSeriesService.php';

nurse_passage_handle_options(['GET', 'PATCH', 'DELETE', 'OPTIONS']);
$user = nurse_passage_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');

$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/nurse/passages/series/([a-f0-9-]{36})#i', $uri, $m)) {
        $id = $m[1];
    }
}
if ($id === '') {
    nurse_passage_json_error('series id requis', 400);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $service = new NursePassageSeriesService();

    if ($method === 'GET') {
        $series = $service->getById($id, $nurseId);
        if (!$series) {
            nurse_passage_json_error('Série introuvable', 404);
        }
        nurse_passage_json_response(['success' => true, 'data' => $series]);
    }

    if ($method === 'PATCH') {
        CSRFMiddleware::handle();
        $body = nurse_passage_read_json_body();
        nurse_passage_json_response([
            'success' => true,
            'data' => $service->update($id, $nurseId, $body),
        ]);
    }

    if ($method === 'DELETE') {
        CSRFMiddleware::handle();
        $service->delete($id, $nurseId);
        nurse_passage_json_response(['success' => true, 'data' => null]);
    }

    nurse_passage_json_error('Méthode non autorisée', 405);
} catch (InvalidArgumentException $e) {
    nurse_passage_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    nurse_passage_json_error($e->getMessage(), 403);
} catch (Throwable $e) {
    error_log('[nurse/passages/series/id] ' . $e->getMessage());
    nurse_passage_json_error('Opération impossible', 500);
}
