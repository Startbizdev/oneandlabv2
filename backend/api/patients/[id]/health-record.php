<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthRecordService.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_record_require_user(['nurse', 'pro', 'lab', 'subaccount', 'preleveur', 'super_admin']);
$patientId = trim((string) ($_GET['id'] ?? ''));
if ($patientId === '') {
    health_json_error('Identifiant patient requis', 400);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    health_json_error('Méthode non autorisée', 405);
}

try {
    $service = new HealthRecordService();
    $data = $service->getRecapForStaff($user, $patientId);
    health_json_response(['success' => true, 'data' => $data]);
} catch (RuntimeException $e) {
    health_json_error($e->getMessage(), 403);
}
