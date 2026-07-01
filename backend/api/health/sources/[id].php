<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../../lib/health/HealthService.php';

health_handle_options(['DELETE', 'OPTIONS']);
$user = health_require_patient();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'DELETE') {
    health_json_error('Méthode non autorisée', 405);
}

$sourceId = (string) ($_GET['id'] ?? '');
if ($sourceId === '') {
    health_json_error('Identifiant source requis', 400);
}

$service = new HealthService();
$ok = $service->revokeSource((string) $user['user_id'], $sourceId);
if (!$ok) {
    health_json_error('Source introuvable ou déjà révoquée', 404);
}

health_json_response(['success' => true, 'data' => ['revoked' => true]]);
