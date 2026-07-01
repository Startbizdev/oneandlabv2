<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthService.php';

health_handle_options(['GET', 'DELETE', 'OPTIONS']);
$user = health_require_patient();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$deviceId = (string) ($_GET['id'] ?? '');
if ($deviceId === '') {
    health_json_error('Identifiant appareil requis', 400);
}

$service = new HealthService();
$patientId = (string) $user['user_id'];

if ($method === 'GET') {
    try {
        health_json_response(['success' => true, 'data' => $service->getDevice($patientId, $deviceId)]);
    } catch (RuntimeException $e) {
        health_json_error($e->getMessage(), 404);
    }
}

if ($method === 'DELETE') {
    $ok = $service->revokeDevice($patientId, $deviceId);
    if (!$ok) {
        health_json_error('Appareil introuvable ou déjà révoqué', 404);
    }
    health_json_response(['success' => true, 'data' => ['revoked' => true]]);
}

health_json_error('Méthode non autorisée', 405);
