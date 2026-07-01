<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiReportService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['nurse', 'pro', 'preleveur']);

try {
    $service = new AiReportService();
    $report = $service->createFromDictation($user, ai_read_json_body());
    ai_json_response(['success' => true, 'data' => $report], 201);
} catch (InvalidArgumentException $e) {
    ai_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    ai_json_error($e->getMessage(), 403);
}
