<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthService.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    health_json_error('Méthode non autorisée', 405);
}

$metricType = isset($_GET['metric_type']) ? (string) $_GET['metric_type'] : null;
$days = isset($_GET['days']) ? (int) $_GET['days'] : 30;
$service = new HealthService();
$patientId = (string) $user['user_id'];

health_json_response([
    'success' => true,
    'data' => [
        'metrics' => $service->listMetrics($patientId, $metricType, $days),
        'summary' => $service->metricsSummary($patientId),
    ],
]);
