<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$limit = max(1, min(200, $limit));

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $db->prepare('
    SELECT id, user_id, type, title, message, data, created_at
    FROM notifications
    WHERE type = ?
    ORDER BY created_at DESC
    LIMIT ?
');
$stmt->execute(['marketing', $limit]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$campaigns = [];
foreach ($rows as $row) {
    $data = !empty($row['data']) ? (is_string($row['data']) ? json_decode($row['data'], true) : $row['data']) : [];
    $campaignId = $data['campaign_id'] ?? $row['id'];
    if (!isset($campaigns[$campaignId])) {
        $campaigns[$campaignId] = [
            'campaign_id' => $campaignId,
            'title' => $row['title'],
            'message' => mb_strlen($row['message']) > 120 ? mb_substr($row['message'], 0, 120) . '…' : $row['message'],
            'created_at' => $row['created_at'],
            'target_label' => $data['target_label'] ?? '—',
            'target_type' => $data['target_type'] ?? 'role',
            'recipient_count' => (int)($data['recipient_count'] ?? 1),
        ];
    }
}

$list = array_values($campaigns);
usort($list, function ($a, $b) {
    return strcmp($b['created_at'], $a['created_at']);
});

echo json_encode([
    'success' => true,
    'data' => $list,
]);
