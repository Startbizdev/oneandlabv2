<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';

[$user, $db, $moduleConfig, $orderService, $catalogService] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$pharmacyId = trim((string) ($_GET['id'] ?? ''));
if ($pharmacyId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID pharmacie requis']);
    exit;
}

try {
    $profile = $catalogService->publicProfile($pharmacyId);
    if ($profile === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Pharmacie introuvable']);
        exit;
    }

    $config = $moduleConfig->getConfig();
    $viewerId = (string) ($user['user_id'] ?? '');
    $catalogVisible = !empty($profile['catalog_visible']);
    unset($profile['catalog_visible']);
    $allowed = PharmacyCatalogService::mayViewPublicProfile(
        $catalogVisible,
        $viewerId !== '' && $viewerId === (string) $profile['id'],
        $catalogService->viewerHasPharmacyOrder($viewerId, $pharmacyId),
        ($user['role'] ?? '') === 'super_admin',
        PharmacyModuleConfig::canOrder($user, $config),
    );
    if (!$allowed) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Pharmacie introuvable']);
        exit;
    }

    echo json_encode(['success' => true, 'data' => $profile]);
} catch (Throwable $e) {
    ApiServerError::respond('fiche pharmacie ' . $pharmacyId, $e, 'Impossible de charger cette pharmacie.');
}
