<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../../lib/health/HealthService.php';

health_handle_options(['POST', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    health_json_error('Méthode non autorisée', 405);
}

$deviceId = (string) ($_GET['id'] ?? '');
if ($deviceId === '') {
    health_json_error('Identifiant appareil requis', 400);
}

$body = health_read_json_body();
$body['connected_device_id'] = $deviceId;

$service = new HealthService();
$patientId = (string) $user['user_id'];

try {
    $service->getDevice($patientId, $deviceId);
    $result = $service->ingestBatch($patientId, $body);
    health_json_response(['success' => true, 'data' => $result]);
} catch (InvalidArgumentException $e) {
    health_json_error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    health_json_error($e->getMessage(), 404);
} catch (Throwable $e) {
    error_log('health/devices/sync: ' . $e->getMessage());
    health_json_error('Synchronisation impossible', 500);
}
