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
require_once __DIR__ . '/../../lib/SubscriptionService.php';
$limitsConfig = require __DIR__ . '/../../config/plan-limits.php';
$subscriptionService = new SubscriptionService($db);
$role = $user['role'] ?? null;
$userId = $user['user_id'] ?? null;

$planSlug = null;
$data = ['plan_slug' => null];

if ($role === 'nurse') {
    $planSlug = $subscriptionService->getActiveNursePlan($userId);
    $nurseLimits = $limitsConfig['nurse'][$planSlug] ?? $limitsConfig['nurse']['discovery'];
    // null = illimité (nurse_pro) — ne pas utiliser ?? 10 qui remplace null par 10
    $maxAppointmentsPerMonth = array_key_exists('max_appointments_per_month', $nurseLimits)
        ? $nurseLimits['max_appointments_per_month']
        : ($limitsConfig['nurse']['discovery']['max_appointments_per_month'] ?? 10);
    $appointmentsCountThisMonth = 0;
    if ($maxAppointmentsPerMonth !== null) {
        // Mois courant en Europe/Paris (cohérent avec les utilisateurs français)
        require_once __DIR__ . '/../../lib/NurseMonthlyAllowance.php';
        $appointmentsCountThisMonth = NurseMonthlyAllowance::count($db, $userId);
    }
    $data = [
        'plan_slug' => $planSlug,
        'max_radius_km' => $nurseLimits['max_radius_km'] ?? 20,
        'max_care_types' => $nurseLimits['max_care_types'] ?? null,
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
        // Explicit null means unlimited; only a missing key falls back to zero.
        'max_preleveurs' => array_key_exists('max_preleveurs', $labLimits) ? $labLimits['max_preleveurs'] : 0,
        'max_subaccounts' => array_key_exists('max_subaccounts', $labLimits) ? $labLimits['max_subaccounts'] : 0,
    ];
}

echo json_encode(['success' => true, 'data' => $data]);
