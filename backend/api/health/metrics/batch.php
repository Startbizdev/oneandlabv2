<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthService.php';

health_handle_options(['POST', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    health_json_error('Méthode non autorisée', 405);
}

$body = health_read_json_body();
$service = new HealthService();

try {
    $result = $service->ingestBatch((string) $user['user_id'], $body);
    health_json_response(['success' => true, 'data' => $result]);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('health/metrics/batch: ' . $e->getMessage());
    health_json_error('Synchronisation impossible', 500);
}
