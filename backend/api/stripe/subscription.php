<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0 || strpos($origin, 'http://127.0.0.1:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

try {
    $authMiddleware = new AuthMiddleware();
    $authUser = $authMiddleware->handle();
    $roleMiddleware = new RoleMiddleware();
    $roleMiddleware->handle($authUser, ['nurse', 'lab']);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$userId = $authUser['user_id'];

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $pdo->prepare('SELECT id, user_id, stripe_customer_id, stripe_subscription_id, price_id, plan_slug, status, trial_ends_at, current_period_end, created_at, updated_at FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    echo json_encode(['success' => true, 'data' => null]);
    exit;
}

$data = [
    'id' => $row['id'],
    'user_id' => $row['user_id'],
    'plan_slug' => $row['plan_slug'],
    'status' => $row['status'],
    'trial_ends_at' => $row['trial_ends_at'],
    'current_period_end' => $row['current_period_end'],
    'created_at' => $row['created_at'],
    'updated_at' => $row['updated_at'],
];
echo json_encode(['success' => true, 'data' => $data]);
