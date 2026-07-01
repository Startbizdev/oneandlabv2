<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthRecordService.php';

health_handle_options(['GET', 'OPTIONS']);
$user = health_require_patient();
$service = new HealthRecordService();
$data = $service->exportForPatient((string) $user['user_id']);

header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="cary-carnet-' . date('Y-m-d') . '.json"');
echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
