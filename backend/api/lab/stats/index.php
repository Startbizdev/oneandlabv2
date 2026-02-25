<?php

/**
 * API Lab - Statistiques
 * GET: Statistiques agrégées (lab + sous-comptes + préleveurs)
 * Uniquement prises de sang (blood_test), pas de soins infirmiers
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../models/Appointment.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (strpos($origin, 'http://localhost:') === 0 || in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$role = $user['role'] ?? '';
if (!in_array($role, ['lab', 'subaccount'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux laboratoires et sous-comptes']);
    exit;
}

$labId = $user['user_id'];
$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

// Sous-compte : uniquement les RDV assignés à ce sous-compte. Lab : lab + sous-comptes + préleveurs
$teamMembers = [];
if ($role === 'subaccount') {
    $labIds = [$labId];
} else {
    $stmt = $db->prepare("SELECT id, role FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
    $stmt->execute([$labId, $labId]);
    $teamRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $labIds = array_column($teamRows, 'id');
    foreach ($teamRows as $r) {
        $teamMembers[$r['id']] = $r['role'];
    }
    if (empty($labIds)) {
        $labIds = [$labId];
    }
}

$placeholders = implode(',', array_fill(0, count($labIds), '?'));
$params = array_merge($labIds, []);

$sql = "SELECT a.* FROM appointments a
    WHERE a.assigned_lab_id IN ($placeholders)
    AND a.type = 'blood_test'
    ORDER BY a.scheduled_at DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Déchiffrer si nécessaire
$appointmentModel = new Appointment();
$appointments = [];
foreach ($rows as $row) {
    try {
        $decrypted = $appointmentModel->getById($row['id'], $labId, $role);
        if ($decrypted) {
            $appointments[] = $decrypted;
        }
    } catch (Exception $e) {
        $appointments[] = [
            'id' => $row['id'],
            'type' => $row['type'],
            'status' => $row['status'],
            'scheduled_at' => $row['scheduled_at'],
            'created_at' => $row['created_at'] ?? null,
            'duration_minutes' => $row['duration_minutes'] ?? null,
            'started_at' => $row['started_at'] ?? null,
            'completed_at' => $row['completed_at'] ?? null,
            'assigned_lab_id' => $row['assigned_lab_id'] ?? null,
        ];
    }
}

$now = new DateTime();
$todayStart = (clone $now)->setTime(0, 0, 0);
$todayEnd = (clone $now)->setTime(23, 59, 59);
$monthStart = (new DateTime())->setDate((int) $now->format('Y'), (int) $now->format('m'), 1)->setTime(0, 0, 0);

$monthApps = array_filter($appointments, fn($a) => (new DateTime($a['scheduled_at'])) >= $monthStart);
$todayApps = array_filter($appointments, function ($a) use ($todayStart, $todayEnd) {
    $t = new DateTime($a['scheduled_at']);
    return $t >= $todayStart && $t <= $todayEnd;
});
$completed = array_filter($appointments, fn($a) => ($a['status'] ?? '') === 'completed');
$durations = array_filter(array_map(fn($a) => $a['duration_minutes'] ?? null, $completed), fn($d) => $d !== null && $d > 0);

$byStatus = [];
foreach ($appointments as $a) {
    $s = $a['status'] ?? 'unknown';
    $byStatus[$s] = ($byStatus[$s] ?? 0) + 1;
}

$byType = [
    'blood_test' => count(array_filter($appointments, fn($a) => ($a['type'] ?? '') === 'blood_test')),
    'nursing' => 0,
];

$avgDuration = count($durations) > 0
    ? (int) round(array_sum($durations) / count($durations))
    : 0;

$completionRate = count($appointments) > 0
    ? (int) round((count($completed) / count($appointments)) * 100)
    : 0;

$statsOnly = isset($_GET['stats_only']) && $_GET['stats_only'] === '1';
$stats = [
    'totalAppointments' => count($appointments),
    'monthAppointments' => count($monthApps),
    'todayCount' => count($todayApps),
    'completionRate' => $completionRate,
    'averageDuration' => $avgDuration,
    'byStatus' => $byStatus,
    'byType' => $byType,
];

$data = ['stats' => $stats];
if (!$statsOnly) {
    $data['appointments'] = $appointments;
}

// Vue lab : indicateur + répartition par assigné (sous-compte / préleveur)
if ($role === 'lab') {
    $data['isLabView'] = true;
    $data['teamSummary'] = [
        'total' => count($labIds),
        'lab' => (int) (isset($teamMembers[$labId]) && $teamMembers[$labId] === 'lab'),
        'subaccounts' => count(array_filter($teamMembers, fn($r) => $r === 'subaccount')),
        'preleveurs' => count(array_filter($teamMembers, fn($r) => $r === 'preleveur')),
    ];
    $byAssignedLab = [];
    foreach ($appointments as $a) {
        $id = $a['assigned_lab_id'] ?? null;
        if ($id === null || $id === '') {
            continue;
        }
        if (!isset($byAssignedLab[$id])) {
            $byAssignedLab[$id] = [
                'id' => $id,
                'displayName' => $a['assigned_lab_display_name'] ?? 'Inconnu',
                'role' => $a['assigned_lab_role'] ?? 'lab',
                'total' => 0,
                'month' => 0,
                'today' => 0,
                'completed' => 0,
                'byStatus' => [],
            ];
        }
        $byAssignedLab[$id]['total']++;
        $sched = isset($a['scheduled_at']) ? new DateTime($a['scheduled_at']) : null;
        if ($sched && $sched >= $monthStart) {
            $byAssignedLab[$id]['month']++;
        }
        if ($sched && $sched >= $todayStart && $sched <= $todayEnd) {
            $byAssignedLab[$id]['today']++;
        }
        if (($a['status'] ?? '') === 'completed') {
            $byAssignedLab[$id]['completed']++;
        }
        $st = $a['status'] ?? 'unknown';
        $byAssignedLab[$id]['byStatus'][$st] = ($byAssignedLab[$id]['byStatus'][$st] ?? 0) + 1;
    }
    foreach ($byAssignedLab as $id => &$row) {
        $row['completionRate'] = $row['total'] > 0 ? (int) round(($row['completed'] / $row['total']) * 100) : 0;
    }
    unset($row);
    $data['byAssignedLab'] = array_values($byAssignedLab);
}

echo json_encode([
    'success' => true,
    'data' => $data,
]);
