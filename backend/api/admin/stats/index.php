<?php

/**
 * API Admin - Statistiques tableau de bord
 * GET: Statistiques globales (super_admin uniquement)
 * - Comptages utilisateurs par rôle (patients, infirmiers, labos, sous-labos, préleveurs, pros)
 * - Comptages rendez-vous par statut
 * - Derniers inscrits, derniers RDV, inscriptions en attente
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../models/Appointment.php';
require_once __DIR__ . '/../../../models/RegistrationRequest.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
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

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin']);

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$adminId = $user['user_id'];

// 1) Utilisateurs par rôle (comptage)
$stmt = $db->query("SELECT role, COUNT(*) as cnt FROM profiles GROUP BY role");
$usersByRole = [
    'patient' => 0,
    'nurse' => 0,
    'lab' => 0,
    'subaccount' => 0,
    'preleveur' => 0,
    'pro' => 0,
    'super_admin' => 0,
];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $r = $row['role'] ?? '';
    if (isset($usersByRole[$r])) {
        $usersByRole[$r] = (int) $row['cnt'];
    }
}
$usersByRole['total'] = array_sum($usersByRole);

// 2) Rendez-vous par statut (comptage)
$stmt = $db->query("SELECT status, COUNT(*) as cnt FROM appointments GROUP BY status");
$appointmentsByStatus = [
    'pending' => 0,
    'confirmed' => 0,
    'inProgress' => 0,
    'completed' => 0,
    'canceled' => 0,
    'refused' => 0,
];
$totalAppointments = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $s = $row['status'] ?? '';
    $cnt = (int) $row['cnt'];
    if (isset($appointmentsByStatus[$s])) {
        $appointmentsByStatus[$s] = $cnt;
    } else {
        $appointmentsByStatus[$s] = $cnt;
    }
    $totalAppointments += $cnt;
}
$appointmentsByStatus['total'] = $totalAppointments;

// 3) Inscriptions en attente
$stmt = $db->query("SELECT COUNT(*) as cnt FROM registration_requests WHERE status = 'pending'");
$registrationRequestsPending = (int) $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

// 4) Derniers inscrits (10)
$userModel = new User();
$lastUsersResult = $userModel->getAll([], 1, 10, $adminId, 'super_admin');
$lastUsers = $lastUsersResult['data'];

// 5) Derniers rendez-vous (10) — IDs puis déchiffrement
$stmt = $db->query("
    SELECT id FROM appointments
    ORDER BY scheduled_at DESC
    LIMIT 10
");
$lastAppointmentIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
$appointmentModel = new Appointment();
$lastAppointments = [];
foreach ($lastAppointmentIds as $aid) {
    try {
        $decrypted = $appointmentModel->getById($aid, $adminId, 'super_admin');
        if ($decrypted) {
            $lastAppointments[] = $decrypted;
        }
    } catch (Exception $e) {
        $lastAppointments[] = [
            'id' => $aid,
            'type' => 'nursing',
            'status' => 'pending',
            'scheduled_at' => null,
            'form_data' => null,
        ];
    }
}

// 6) Dernières activités (access_logs) — temps réel
$lastActivityLogs = [];
try {
    $stmt = $db->query("
        SELECT id, user_id, role, action, resource_type, resource_id, created_at
        FROM access_logs
        ORDER BY created_at DESC
        LIMIT 15
    ");
    $lastActivityLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // table peut ne pas exister
}

// 7) Dernières mises à jour de comptes (profiles.updated_at) + noms déchiffrés
$lastProfileUpdates = [];
try {
    $stmt = $db->query("
        SELECT id, role, updated_at
        FROM profiles
        WHERE updated_at IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 10
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        try {
            $decrypted = $userModel->getById($row['id'], $adminId, 'super_admin');
            if ($decrypted) {
                $row['first_name'] = $decrypted['first_name'] ?? '';
                $row['last_name'] = $decrypted['last_name'] ?? '';
                $row['email'] = $decrypted['email'] ?? '';
            }
        } catch (Exception $e) {
            $row['first_name'] = '';
            $row['last_name'] = '';
            $row['email'] = '';
        }
        $lastProfileUpdates[] = $row;
    }
} catch (Exception $e) {
    // colonne peut ne pas exister
}

echo json_encode([
    'success' => true,
    'data' => [
        'usersByRole' => $usersByRole,
        'appointmentsByStatus' => $appointmentsByStatus,
        'registrationRequestsPending' => $registrationRequestsPending,
        'lastUsers' => $lastUsers,
        'lastAppointments' => $lastAppointments,
        'lastActivityLogs' => $lastActivityLogs,
        'lastProfileUpdates' => $lastProfileUpdates,
    ],
], JSON_UNESCAPED_UNICODE);
