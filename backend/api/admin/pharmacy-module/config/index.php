<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../pharmacy/_helpers.php';

[$user, $db, $moduleConfig] = pharmacyApiBootstrap(['GET', 'PATCH', 'OPTIONS']);
(new RoleMiddleware())->handle($user, ['super_admin']);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    echo json_encode(['success' => true, 'data' => $moduleConfig->getConfig()]);
    exit;
}

if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON invalide']);
        exit;
    }
    $saved = $moduleConfig->saveConfig($body);
    echo json_encode(['success' => true, 'data' => $saved]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
