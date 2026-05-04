<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../models/User.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
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

$role = (string) ($user['role'] ?? '');
$userId = (string) ($user['user_id'] ?? '');
$allowedRoles = ['lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'super_admin'];
if (!in_array($role, $allowedRoles, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux professionnels']);
    exit;
}

$patientId = trim((string) ($_GET['patient_id'] ?? ''));
$relativeId = trim((string) ($_GET['relative_id'] ?? ''));
$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = min(max((int) ($_GET['limit'] ?? 5), 1), 25);
$offset = ($page - 1) * $limit;

if ($patientId === '' || !Validation::uuid($patientId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'patient_id invalide']);
    exit;
}
if ($relativeId !== '' && !Validation::uuid($relativeId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'relative_id invalide']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

function patientHistoryHasAccess(PDO $db, string $role, string $userId, string $patientId): bool
{
    if ($role === 'super_admin') {
        return true;
    }

    if ($role === 'pro') {
        $userModel = new User();
        return $userModel->hasProfessionalAccessToPatient($userId, $patientId);
    }

    if ($role === 'nurse') {
        $stmt = $db->prepare("
            SELECT 1 FROM appointments
            WHERE patient_id = ?
            AND (assigned_nurse_id = ? OR created_by = ?)
            LIMIT 1
        ");
        $stmt->execute([$patientId, $userId, $userId]);
        return (bool) $stmt->fetchColumn();
    }

    if (in_array($role, ['lab', 'subaccount', 'preleveur'], true)) {
        $teamIds = LabTeamAccess::teamMemberIds($db, $userId, $role);
        if (empty($teamIds)) {
            return false;
        }
        $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
        $stmt = $db->prepare("
            SELECT 1 FROM appointments
            WHERE patient_id = ?
            AND (assigned_lab_id IN ($placeholders) OR assigned_to IN ($placeholders))
            LIMIT 1
        ");
        $stmt->execute(array_merge([$patientId], $teamIds, $teamIds));
        return (bool) $stmt->fetchColumn();
    }

    return false;
}

if (!patientHistoryHasAccess($db, $role, $userId, $patientId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$where = 'a.patient_id = ?';
$params = [$patientId];
if ($relativeId !== '') {
    $where .= ' AND a.relative_id = ?';
    $params[] = $relativeId;
}
try {
    $hasMergedColumn = (bool) $db->query("
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'appointments'
          AND COLUMN_NAME = 'merged_into_appointment_id'
    ")->fetchColumn();
} catch (Throwable $e) {
    $hasMergedColumn = false;
}
if ($hasMergedColumn) {
    $where .= ' AND a.merged_into_appointment_id IS NULL';
}

$countStmt = $db->prepare("SELECT COUNT(*) FROM appointments a WHERE $where");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$stmt = $db->prepare("
    SELECT
        a.id,
        a.type,
        a.status,
        a.scheduled_at,
        a.created_at,
        a.assigned_lab_id,
        a.assigned_nurse_id,
        a.assigned_to,
        cc.name AS category_name
    FROM appointments a
    LEFT JOIN care_categories cc ON cc.id = a.category_id
    WHERE $where
    ORDER BY COALESCE(a.scheduled_at, a.created_at) DESC
    LIMIT " . (int) $limit . ' OFFSET ' . (int) $offset
);
$stmt->execute($params);
$appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ids = array_values(array_filter(array_map(static fn($row) => (string) ($row['id'] ?? ''), $appointments)));
$resultsByAppointment = [];
if (!empty($ids)) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $docStmt = $db->prepare("
        SELECT id, appointment_id, file_name, file_size, mime_type, document_type, created_at
        FROM medical_documents
        WHERE appointment_id IN ($placeholders)
        AND document_type = 'resultats'
        ORDER BY created_at DESC
    ");
    $docStmt->execute($ids);
    foreach ($docStmt->fetchAll(PDO::FETCH_ASSOC) as $doc) {
        $aptId = (string) ($doc['appointment_id'] ?? '');
        if ($aptId === '') {
            continue;
        }
        $resultsByAppointment[$aptId][] = [
            'id' => $doc['id'],
            'file_name' => $doc['file_name'],
            'file_size' => isset($doc['file_size']) ? (int) $doc['file_size'] : 0,
            'mime_type' => $doc['mime_type'],
            'document_type' => $doc['document_type'],
            'created_at' => $doc['created_at'],
        ];
    }
}

$profileIds = [];
foreach ($appointments as $row) {
    foreach (['assigned_lab_id', 'assigned_nurse_id', 'assigned_to'] as $key) {
        if (!empty($row[$key])) {
            $profileIds[] = (string) $row[$key];
        }
    }
}
$displayNames = [];
if (!empty($profileIds)) {
    $userModel = new User();
    $displayNames = $userModel->getDisplayNamesByIds(array_values(array_unique($profileIds)));
}

$data = array_map(static function (array $row) use ($resultsByAppointment, $displayNames): array {
    $id = (string) $row['id'];
    return [
        'id' => $id,
        'type' => $row['type'],
        'status' => $row['status'],
        'scheduled_at' => $row['scheduled_at'],
        'created_at' => $row['created_at'],
        'category_name' => $row['category_name'],
        'assigned_lab_display_name' => !empty($row['assigned_lab_id']) ? ($displayNames[(string) $row['assigned_lab_id']] ?? null) : null,
        'assigned_nurse_display_name' => !empty($row['assigned_nurse_id']) ? ($displayNames[(string) $row['assigned_nurse_id']] ?? null) : null,
        'assigned_to_display_name' => !empty($row['assigned_to']) ? ($displayNames[(string) $row['assigned_to']] ?? null) : null,
        'resultats' => $resultsByAppointment[$id] ?? [],
    ];
}, $appointments);

echo json_encode([
    'success' => true,
    'data' => $data,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'pages' => $limit > 0 ? (int) ceil($total / $limit) : 1,
    ],
]);
