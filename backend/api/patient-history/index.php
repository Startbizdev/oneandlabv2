<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../lib/DbSchemaCache.php';
require_once __DIR__ . '/../../lib/AppointmentListPayload.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/Appointment.php';

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
$limit = min(max((int) ($_GET['limit'] ?? 20), 1), 120);
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

/**
 * Historique dossier patient : uniquement les RDV du professionnel connecté (assignation / création).
 *
 * @return array{0: string, 1: list<mixed>}
 */
function patientHistoryScopeFilter(PDO $db, string $role, string $userId): array
{
    if ($role === 'super_admin') {
        return ['', []];
    }

    if ($role === 'nurse') {
        return [' AND a.assigned_nurse_id = ?', [$userId]];
    }

    if ($role === 'pro') {
        return [' AND a.created_by = ?', [$userId]];
    }

    if ($role === 'preleveur') {
        return [' AND a.assigned_to = ?', [$userId]];
    }

    if (in_array($role, ['lab', 'subaccount'], true)) {
        $teamIds = LabTeamAccess::teamMemberIds($db, $userId, $role);
        if ($teamIds === []) {
            return [' AND 1 = 0', []];
        }
        $placeholders = implode(',', array_fill(0, count($teamIds), '?'));

        return [" AND a.assigned_lab_id IN ($placeholders)", $teamIds];
    }

    return [' AND 1 = 0', []];
}

[$scopeSql, $scopeParams] = patientHistoryScopeFilter($db, $role, $userId);

$hasRelativeColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'relative_id');
$hasPatientRelativesTable = DbSchemaCache::tableExists($db, 'patient_relatives');
$useRelativeJoin = $hasRelativeColumn && $hasPatientRelativesTable;
$hasMergedColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'merged_into_appointment_id');

$where = 'a.patient_id = ?';
$params = [$patientId];
if ($relativeId !== '') {
    $where .= ' AND a.relative_id = ?';
    $params[] = $relativeId;
}
if ($hasMergedColumn) {
    $where .= ' AND a.merged_into_appointment_id IS NULL';
}
$where .= $scopeSql;
$params = array_merge($params, $scopeParams);

$countStmt = $db->prepare("SELECT COUNT(*) FROM appointments a WHERE $where");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

if ($useRelativeJoin) {
    $sql = '
        SELECT
            a.*,
            pr.first_name_encrypted as relative_first_name_encrypted,
            pr.first_name_dek as relative_first_name_dek,
            pr.last_name_encrypted as relative_last_name_encrypted,
            pr.last_name_dek as relative_last_name_dek,
            pr.email_encrypted as relative_email_encrypted,
            pr.email_dek as relative_email_dek,
            pr.phone_encrypted as relative_phone_encrypted,
            pr.phone_dek as relative_phone_dek,
            pr.relationship_type as relative_relationship_type,
            cc.name as category_name,
            cc.type as category_type,
            cc.icon as category_icon,
            cc.image_url as category_image_url
        FROM appointments a
        LEFT JOIN patient_relatives pr ON a.relative_id = pr.id
        LEFT JOIN care_categories cc ON a.category_id = cc.id
        WHERE ' . $where . '
        ORDER BY COALESCE(a.scheduled_at, a.created_at) DESC
        LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
} else {
    $sql = '
        SELECT
            a.*,
            cc.name as category_name,
            cc.type as category_type,
            cc.icon as category_icon,
            cc.image_url as category_image_url
        FROM appointments a
        LEFT JOIN care_categories cc ON a.category_id = cc.id
        WHERE ' . $where . '
        ORDER BY COALESCE(a.scheduled_at, a.created_at) DESC
        LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$appointmentModel = new Appointment();
$decrypted = AppointmentListPayload::decryptRowsForList($appointmentModel, $rows, $userId, $role);
$data = AppointmentListPayload::enrichForListCards($db, $appointmentModel, $decrypted, $hasMergedColumn);

$ids = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['id'] ?? ''), $data)));
$resultsByAppointment = [];
if ($ids !== []) {
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

foreach ($data as &$row) {
    $id = (string) ($row['id'] ?? '');
    $row['resultats'] = $resultsByAppointment[$id] ?? [];
}
unset($row);

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
