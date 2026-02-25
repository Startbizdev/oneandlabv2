<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../models/User.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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
    $roleMiddleware->handle($authUser, ['super_admin']);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$adminId = $authUser['user_id'];
$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$roleFilter = trim((string)($_GET['role'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? ''));

$sql = 'SELECT s.id, s.user_id, s.plan_slug, s.status, s.trial_ends_at, s.current_period_end, s.updated_at, p.role FROM subscriptions s JOIN profiles p ON p.id = s.user_id WHERE 1=1';
$params = [];
if ($roleFilter !== '') {
    $sql .= ' AND p.role = ?';
    $params[] = $roleFilter;
}
if ($statusFilter !== '') {
    $sql .= ' AND s.status = ?';
    $params[] = $statusFilter;
}
$sql .= ' ORDER BY s.updated_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$userModel = new User();
$cache = [];
$list = [];
foreach ($rows as $row) {
    $uid = $row['user_id'];
    if (!isset($cache[$uid])) {
        try {
            $u = $userModel->getById($uid, $adminId, 'super_admin');
            $cache[$uid] = ['email' => $u['email'] ?? '', 'role' => $u['role'] ?? $row['role']];
        } catch (Exception $e) {
            $cache[$uid] = ['email' => '(inconnu)', 'role' => $row['role']];
        }
    }
    $list[] = [
        'id' => $row['id'],
        'user_id' => $row['user_id'],
        'email' => $cache[$uid]['email'],
        'role' => $cache[$uid]['role'],
        'plan_slug' => $row['plan_slug'],
        'status' => $row['status'],
        'trial_ends_at' => $row['trial_ends_at'],
        'current_period_end' => $row['current_period_end'],
        'updated_at' => $row['updated_at'],
    ];
}

echo json_encode(['success' => true, 'data' => $list]);
