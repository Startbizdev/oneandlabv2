<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

require_once __DIR__ . '/../../models/Notification.php';

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
$limit = max(1, min(50, $limit));
$offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

$notificationModel = new Notification();
$fetchLimit = $limit + 1;
$rows = $notificationModel->getByUser($user['user_id'], $fetchLimit, $offset);

$hasMore = count($rows) > $limit;
if ($hasMore) {
    array_pop($rows);
}

echo json_encode([
    'success' => true,
    'data' => $rows,
    'pagination' => [
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => $hasMore,
    ],
]);
