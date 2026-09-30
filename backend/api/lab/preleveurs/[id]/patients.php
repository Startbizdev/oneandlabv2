<?php

/**
 * API Lab - Patients assignés à un préleveur
 * GET: patients visibles par le préleveur (créés par lui ou assignés par le labo)
 * POST: assigner un patient du labo au préleveur { patient_id }
 * DELETE: retirer l'assignation ?patient_id=
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../models/User.php';
require_once __DIR__ . '/../../../../lib/Validation.php';
require_once __DIR__ . '/../../../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../../../lib/Logger.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$role = (string) ($user['role'] ?? '');
$requesterId = (string) ($user['user_id'] ?? '');
if (!in_array($role, ['lab', 'subaccount'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé au laboratoire ou au sous-compte']);
    exit;
}

$preleveurId = trim((string) ($_GET['id'] ?? ''));
if ($preleveurId === '' || !Validation::uuid($preleveurId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Identifiant du préleveur invalide']);
    exit;
}

$config = require __DIR__ . '/../../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

if (!LabTeamAccess::isPreleveurOfTeam($db, $requesterId, $role, $preleveurId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Ce préleveur n\'appartient pas à votre laboratoire']);
    exit;
}

$userModel = new User();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
    $filters = ['role' => 'patient', 'created_by' => $preleveurId];
    $search = trim((string) ($_GET['search'] ?? ''));
    if ($search !== '') {
        $filters['search'] = $search;
    }

    $result = $userModel->getAll($filters, $page, $limit, $requesterId, $role);
    $assignedIds = array_column($userModel->listPreleveurAssignments($preleveurId), 'patient_id');
    foreach ($result['data'] as &$patient) {
        $patient['assigned_by_lab'] = in_array((string) ($patient['id'] ?? ''), $assignedIds, true);
    }
    unset($patient);

    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'pagination' => [
            'page' => $result['page'],
            'limit' => $result['limit'],
            'total' => $result['total'],
            'pages' => $result['pages'],
        ],
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();
    $input = json_decode(file_get_contents('php://input'), true);
    $patientId = trim((string) (is_array($input) ? ($input['patient_id'] ?? '') : ''));
    if ($patientId === '' || !Validation::uuid($patientId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Patient requis']);
        exit;
    }
    if (!$userModel->isPatientVisibleInStaffList($requesterId, $role, $patientId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Ce patient ne fait pas partie de vos patients']);
        exit;
    }

    try {
        $userModel->assignPatientToPreleveur($patientId, $preleveurId);
    } catch (Throwable $e) {
        error_log('lab preleveur assign patient: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Assignation impossible']);
        exit;
    }
    (new Logger())->log($requesterId, $role, 'assign_patient', 'profile', $patientId, ['preleveur_id' => $preleveurId]);

    echo json_encode(['success' => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    CSRFMiddleware::handle();
    $patientId = trim((string) ($_GET['patient_id'] ?? ''));
    if ($patientId === '' || !Validation::uuid($patientId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Patient requis']);
        exit;
    }
    if (!$userModel->removePreleveurAssignment($preleveurId, $patientId)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Aucune assignation pour ce patient']);
        exit;
    }
    (new Logger())->log($requesterId, $role, 'unassign_patient', 'profile', $patientId, ['preleveur_id' => $preleveurId]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
