<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthRecordService.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_require_patient();
$service = new HealthRecordService();

try {
    health_json_response([
        'success' => true,
        'data' => $service->getSchemaForPatient((string) $user['user_id']),
    ]);
} catch (Throwable $e) {
    error_log('[health-record/schema] ' . $e->getMessage());
    health_json_error('Schéma carnet indisponible', 500);
}
