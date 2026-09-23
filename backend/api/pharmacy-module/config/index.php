<?php

declare(strict_types=1);

require_once __DIR__ . '/../../pharmacy/_helpers.php';

[$user, $db, $moduleConfig] = pharmacyApiBootstrap(['GET', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$flags = $moduleConfig->uiFlagsForUser($user);
echo json_encode(['success' => true, 'data' => $flags]);
