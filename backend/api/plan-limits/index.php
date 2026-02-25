<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0) {
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
    $user = $authMiddleware->handle();
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$limitsConfig = require __DIR__ . '/../../config/plan-limits.php';
$role = $user['role'] ?? null;
$userId = $user['user_id'] ?? null;

$planSlug = null;
$data = ['plan_slug' => null];

if ($role === 'nurse') {
    $stmt = $db->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
    $stmt->execute([$userId]);
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
    $planSlug = $sub ? ($sub['plan_slug'] ?? 'discovery') : 'discovery';
    $nurseLimits = $limitsConfig['nurse'][$planSlug] ?? $limitsConfig['nurse']['discovery'];
    $maxAppointmentsPerMonth = $nurseLimits['max_appointments_per_month'] ?? 10;
    $appointmentsCountThisMonth = 0;
    if ($maxAppointmentsPerMonth !== null) {
        $monthStart = date('Y-m-01 00:00:00');
        $monthEnd = date('Y-m-t 23:59:59');
        $stmtCount = $db->prepare('
            SELECT COUNT(*) FROM appointments
            WHERE assigned_nurse_id = ?
            AND scheduled_at >= ? AND scheduled_at <= ?
            AND status NOT IN (\'canceled\', \'refused\')
        ');
        $stmtCount->execute([$userId, $monthStart, $monthEnd]);
        $appointmentsCountThisMonth = (int) $stmtCount->fetchColumn();
    }
    $data = [
        'plan_slug' => $planSlug,
        'max_radius_km' => $nurseLimits['max_radius_km'] ?? 20,
        'max_care_types' => $nurseLimits['max_care_types'] ?? 3,
        'max_appointments_per_month' => $maxAppointmentsPerMonth,
        'appointments_count_this_month' => $appointmentsCountThisMonth,
    ];
} elseif ($role === 'lab' || $role === 'subaccount') {
    $labId = $role === 'subaccount' ? ($user['lab_id'] ?? $userId) : $userId;
    $stmt = $db->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
    $stmt->execute([$labId]);
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
    $planSlug = $sub ? ($sub['plan_slug'] ?? 'free') : 'free';
    $labLimits = $limitsConfig['lab'][$planSlug] ?? $limitsConfig['lab']['free'];
    $data = [
        'plan_slug' => $planSlug,
        'max_preleveurs' => $labLimits['max_preleveurs'] ?? 0,
        'max_subaccounts' => $labLimits['max_subaccounts'] ?? 0,
    ];
}

echo json_encode(['success' => true, 'data' => $data]);
