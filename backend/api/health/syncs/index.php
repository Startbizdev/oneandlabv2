<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthService.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    health_json_error('Méthode non autorisée', 405);
}

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
$service = new HealthService();

health_json_response([
    'success' => true,
    'data' => $service->listSyncs((string) $user['user_id'], $limit),
]);
