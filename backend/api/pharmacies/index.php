<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../models/User.php';

[$user, $db, $moduleConfig, $orderService, $catalogService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$config = $moduleConfig->getConfig();
if (!PharmacyModuleConfig::canOrder($user, $config) && !PharmacyModuleConfig::canReceive($user, $config)
    && ($user['role'] ?? '') !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Module non disponible']);
    exit;
}

$postalCode = isset($_GET['postal_code']) ? trim((string) $_GET['postal_code']) : null;
$mode = isset($_GET['fulfillment_mode']) ? trim((string) $_GET['fulfillment_mode']) : null;
$favoriteUserId = PharmacyModuleConfig::canOrder($user, $config)
    ? (string) ($user['user_id'] ?? '')
    : null;

$patientPharmacyIds = [];
$patientId = isset($_GET['patient_id']) ? trim((string) $_GET['patient_id']) : '';
if ($patientId !== '' && Validation::uuid($patientId)) {
    $actorId = (string) ($user['user_id'] ?? '');
    $isPatientSelf = (string) ($user['role'] ?? '') === 'patient' && $actorId === $patientId;
    $userModel = new User();
    if ($isPatientSelf || $userModel->hasProfessionalAccessToPatient($actorId, $patientId)) {
        $patientPharmacyIds = $catalogService->pharmacyIdsLinkedToPatient($patientId);
    }
}

$items = $catalogService->listPharmacies($postalCode, $mode, $favoriteUserId, $patientPharmacyIds);
echo json_encode(['success' => true, 'data' => $items]);
