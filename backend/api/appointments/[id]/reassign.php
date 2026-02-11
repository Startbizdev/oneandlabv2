<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Logger.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin', 'admin']);

$csrfMiddleware = new CSRFMiddleware();
$csrfMiddleware->handle();

$pathParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$appointmentId = $pathParts[array_search('appointments', $pathParts) + 1] ?? null;

if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$assignedTo = $input['assigned_to'] ?? null;
$assignedLabId = $input['assigned_lab_id'] ?? null;
$assignedNurseId = $input['assigned_nurse_id'] ?? null;

if (!$assignedTo && !$assignedLabId && !$assignedNurseId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'assigned_to, assigned_lab_id ou assigned_nurse_id requis']);
    exit;
}

$pdo = getDBConnection();
$logger = new Logger();

try {
    // Récupérer le type du rendez-vous pour mettre à jour la bonne colonne
    $checkStmt = $pdo->prepare('SELECT type FROM appointments WHERE id = ?');
    $checkStmt->execute([$appointmentId]);
    $appointment = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$appointment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
        exit;
    }

    $type = $appointment['type'] ?? '';

    // Les lab / sous-compte / préleveur ne reçoivent que les RDV prise de sang. Les infirmiers que les RDV soins infirmiers.
    if ($type === 'nursing') {
        if ($assignedLabId !== null || $assignedTo !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Un rendez-vous soins infirmiers ne peut être assigné qu\'à un infirmier (assigned_nurse_id).']);
            exit;
        }
        if ($assignedNurseId === null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'assigned_nurse_id requis pour un rendez-vous soins infirmiers.']);
            exit;
        }
    } elseif ($type === 'blood_test') {
        if ($assignedNurseId !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Un rendez-vous prise de sang ne peut être assigné qu\'à un labo / sous-compte / préleveur (assigned_lab_id ou assigned_to).']);
            exit;
        }
        if ($assignedLabId === null && $assignedTo === null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'assigned_lab_id ou assigned_to requis pour un rendez-vous prise de sang.']);
            exit;
        }
    }

    if ($assignedLabId !== null) {
        // Assignation à un laboratoire (prise de sang uniquement)
        $sql = 'UPDATE appointments SET assigned_lab_id = :assigned_lab_id, assigned_nurse_id = NULL, assigned_to = NULL, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_lab_id' => $assignedLabId,
            ':id' => $appointmentId,
        ]);
        $logger->log($user['user_id'], $user['role'] ?? 'super_admin', 'reassign_appointment', 'appointment', $appointmentId, [
            'assigned_lab_id' => $assignedLabId,
        ]);
    } elseif ($assignedNurseId !== null) {
        // Assignation à un infirmier (soins infirmiers uniquement)
        $sql = 'UPDATE appointments SET assigned_nurse_id = :assigned_nurse_id, assigned_lab_id = NULL, assigned_to = NULL, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_nurse_id' => $assignedNurseId,
            ':id' => $appointmentId,
        ]);
        $logger->log($user['user_id'], $user['role'] ?? 'super_admin', 'reassign_appointment', 'appointment', $appointmentId, [
            'assigned_nurse_id' => $assignedNurseId,
        ]);
    } else {
        // Legacy: assigned_to (préleveur / sous-compte) — prise de sang uniquement
        $sql = 'UPDATE appointments SET assigned_to = :assigned_to, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_to' => $assignedTo,
            ':id' => $appointmentId,
        ]);
        $logger->log($user['user_id'], $user['role'] ?? 'super_admin', 'reassign_appointment', 'appointment', $appointmentId, [
            'new_assigned_to' => $assignedTo,
        ]);
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
