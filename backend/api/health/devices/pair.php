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
    $device = $service->pairDevice((string) $user['user_id'], $body);
    health_json_response(['success' => true, 'data' => $device], 201);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('health/devices/pair: ' . $e->getMessage());
    health_json_error('Appairage impossible', 500);
}
