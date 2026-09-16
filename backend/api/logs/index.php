<?php

/**
 * Journal d'audit HDS (lecture réservée aux super administrateurs).
 * GET /api/logs?page=1&limit=50&action=...&resource_type=...
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$cors = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $cors['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$user = (new AuthMiddleware())->handle();
(new RoleMiddleware())->handle($user, ['super_admin']);

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
$where = [];
$params = [];
$allowed = ['action' => 'action', 'resource_type' => 'resource_type'];
foreach ($allowed as $key => $column) {
    $value = trim((string) ($_GET[$key] ?? ''));
    if ($value !== '' && $value !== 'all') { $where[] = "$column = :$key"; $params[":$key"] = $value; }
}
foreach (['start_date' => 'created_at >= :start_date', 'end_date' => 'created_at < :end_date'] as $key => $clause) {
    $value = trim((string) ($_GET[$key] ?? ''));
    if ($value !== '') {
        if ($key === 'end_date') { $value .= ' 00:00:00'; $value = date('Y-m-d H:i:s', strtotime($value . ' +1 day')); }
        else { $value .= ' 00:00:00'; }
        $where[] = $clause; $params[":$key"] = $value;
    }
}
$search = trim((string) ($_GET['search'] ?? ''));
if ($search !== '') {
    $where[] = '(resource_id LIKE :search OR user_id LIKE :search OR action LIKE :search OR resource_type LIKE :search OR ip_address LIKE :search)';
    $params[':search'] = '%' . $search . '%';
}
$condition = $where ? 'WHERE ' . implode(' AND ', $where) : '';
$count = $db->prepare("SELECT COUNT(*) FROM access_logs $condition");
$count->execute($params);
$total = (int) $count->fetchColumn();
$offset = ($page - 1) * $limit;
$stmt = $db->prepare("SELECT id, user_id, role, action, resource_type, resource_id, details, ip_address, user_agent, created_at FROM access_logs $condition ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset");
foreach ($params as $key => $value) { $stmt->bindValue($key, $value); }
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as &$row) {
    if (isset($row['details']) && is_string($row['details']) && $row['details'] !== '') { $decoded = json_decode($row['details'], true); if (json_last_error() === JSON_ERROR_NONE) $row['details'] = $decoded; }
    $row['summary'] = trim(($row['action'] ?? '') . ' · ' . ($row['resource_type'] ?? '') . ($row['resource_id'] ? ' — ' . $row['resource_id'] : ''));
}
unset($row);
echo json_encode(['success' => true, 'data' => $rows, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'pages' => max(1, (int) ceil($total / $limit))]], JSON_UNESCAPED_UNICODE);
