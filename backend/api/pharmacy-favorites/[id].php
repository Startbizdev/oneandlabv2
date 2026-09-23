<?php

declare(strict_types=1);

require_once __DIR__ . '/../pharmacy/_helpers.php';

[$user, $db, $moduleConfig, $orderService, $catalogService, $favoriteService] = pharmacyApiBootstrap(['PUT', 'DELETE', 'OPTIONS']);

$config = $moduleConfig->getConfig();
if (!PharmacyModuleConfig::canOrder($user, $config)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$pharmacyId = trim((string) ($_GET['id'] ?? ''));
if ($pharmacyId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID pharmacie requis']);
    exit;
}

$uid = (string) ($user['user_id'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'PUT';

try {
    if ($method === 'PUT') {
        $favoriteService->add($uid, $pharmacyId);
        echo json_encode(['success' => true]);
        exit;
    }
    if ($method === 'DELETE') {
        $favoriteService->remove($uid, $pharmacyId);
        echo json_encode(['success' => true]);
        exit;
    }
} catch (RuntimeException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
