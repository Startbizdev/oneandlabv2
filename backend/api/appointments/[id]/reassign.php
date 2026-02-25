<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/EmailQueue.php';

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
$roleMiddleware->handle($user, ['super_admin', 'admin', 'lab', 'subaccount']);

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

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

/** Log après envoi de la réponse pour ne pas bloquer l’utilisateur. */
$deferredLog = null;

try {
    // Récupérer le type et la date du rendez-vous
    $checkStmt = $pdo->prepare('SELECT type, scheduled_at FROM appointments WHERE id = ?');
    $checkStmt->execute([$appointmentId]);
    $appointment = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$appointment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
        exit;
    }

    $type = $appointment['type'] ?? '';

    // Lab / subaccount : ne peuvent réassigner que les RDV blood_test dont ils ont la charge (assigned_lab_id = lab principal ou un sous-compte de l'équipe)
    if (in_array($user['role'] ?? '', ['lab', 'subaccount'], true)) {
        $stmtPerm = $pdo->prepare('SELECT assigned_lab_id FROM appointments WHERE id = ?');
        $stmtPerm->execute([$appointmentId]);
        $row = $stmtPerm->fetch(PDO::FETCH_ASSOC);
        $currentAssignedLabId = $row['assigned_lab_id'] ?? null;
        if ($type !== 'blood_test') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Seuls les rendez-vous prise de sang peuvent être réassignés depuis cet espace.']);
            exit;
        }
        $effectiveLabIdForPerm = $user['user_id'];
        if (($user['role'] ?? '') === 'subaccount') {
            $labIdPermStmt = $pdo->prepare('SELECT lab_id FROM profiles WHERE id = ?');
            $labIdPermStmt->execute([$user['user_id']]);
            $labIdPermRow = $labIdPermStmt->fetch(PDO::FETCH_ASSOC);
            if (!empty($labIdPermRow['lab_id'])) {
                $effectiveLabIdForPerm = $labIdPermRow['lab_id'];
            }
        }
        if ($currentAssignedLabId !== null && $currentAssignedLabId !== $user['user_id']) {
            $teamStmt = $pdo->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
            $teamStmt->execute([$effectiveLabIdForPerm, $effectiveLabIdForPerm]);
            $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
            if (!in_array($currentAssignedLabId, $teamIds, true)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Vous ne pouvez réassigner que les rendez-vous de votre équipe.']);
                exit;
            }
        }
    }

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

    if ($type === 'blood_test' && $assignedLabId !== null && $assignedLabId !== '') {
        // Lab / subaccount : le nouvel assigned_lab_id doit être le lab principal ou un de ses sous-comptes
        if (in_array($user['role'] ?? '', ['lab', 'subaccount'], true)) {
            $effectiveLabId = $user['user_id'];
            if (($user['role'] ?? '') === 'subaccount') {
                $labIdStmt = $pdo->prepare('SELECT lab_id FROM profiles WHERE id = ?');
                $labIdStmt->execute([$user['user_id']]);
                $labRow = $labIdStmt->fetch(PDO::FETCH_ASSOC);
                if (!empty($labRow['lab_id'])) {
                    $effectiveLabId = $labRow['lab_id'];
                }
            }
            $allowedLabIdsStmt = $pdo->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount')");
            $allowedLabIdsStmt->execute([$effectiveLabId, $effectiveLabId]);
            $allowedLabIds = array_column($allowedLabIdsStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
            if (!in_array($assignedLabId, $allowedLabIds, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Vous ne pouvez assigner qu\'à votre laboratoire ou à un de vos sous-comptes.']);
                exit;
            }
        }

        // Si un préleveur est assigné, vérifier qu'il appartient au lab/sous-compte assigné
        $ato = ($assignedTo !== null && $assignedTo !== '') ? $assignedTo : null;
        if ($ato) {
            $stmtPre = $pdo->prepare('SELECT id, role, lab_id FROM profiles WHERE id = ?');
            $stmtPre->execute([$ato]);
            $preleveurRow = $stmtPre->fetch(PDO::FETCH_ASSOC);
            if (!$preleveurRow || ($preleveurRow['role'] ?? '') !== 'preleveur') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Le préleveur sélectionné est invalide.']);
                exit;
            }
            $preleveurLabId = $preleveurRow['lab_id'] ?? null;
            if ($preleveurLabId !== $assignedLabId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Ce préleveur n\'appartient pas au laboratoire/sous-compte sélectionné.']);
                exit;
            }
        }

        // Assignation labo + optionnellement préleveur (prise de sang) — une seule requête
        $sql = 'UPDATE appointments SET assigned_lab_id = :assigned_lab_id, assigned_to = :assigned_to, assigned_nurse_id = NULL, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_lab_id' => $assignedLabId,
            ':assigned_to' => $ato,
            ':id' => $appointmentId,
        ]);
        $deferredLog = ['user' => $user, 'appointmentId' => $appointmentId, 'details' => ['assigned_lab_id' => $assignedLabId, 'assigned_to' => $ato]];
        if ($ato) {
            EmailQueue::add('assigned_to_preleveur', null, [
                'appointment_id' => $appointmentId,
                'scheduled_at' => $appointment['scheduled_at'] ?? null,
            ], $ato);
        }
        $responseData = ['success' => true, 'data' => ['assigned_lab_id' => $assignedLabId, 'assigned_to' => $ato]];
    } elseif ($assignedNurseId !== null) {
        // Limite 10 RDV/mois pour infirmier en offre Découverte
        $limits = require __DIR__ . '/../../../config/plan-limits.php';
        $stmtSub = $pdo->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
        $stmtSub->execute([$assignedNurseId]);
        $sub = $stmtSub->fetch(PDO::FETCH_ASSOC);
        $planSlug = $sub ? ($sub['plan_slug'] ?? 'discovery') : 'discovery';
        $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];
        $maxPerMonth = $nurseLimits['max_appointments_per_month'] ?? 10;
        if ($maxPerMonth !== null) {
            $monthStart = date('Y-m-01 00:00:00');
            $monthEnd = date('Y-m-t 23:59:59');
            $stmtCount = $pdo->prepare('
                SELECT COUNT(*) FROM appointments
                WHERE assigned_nurse_id = ?
                AND scheduled_at >= ? AND scheduled_at <= ?
                AND status NOT IN (\'canceled\', \'refused\')
            ');
            $stmtCount->execute([$assignedNurseId, $monthStart, $monthEnd]);
            $count = (int) $stmtCount->fetchColumn();
            if ($count >= $maxPerMonth) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error' => "L'infirmier a atteint la limite de {$maxPerMonth} rendez-vous ce mois (offre Découverte).",
                    'code' => 'PLAN_LIMIT',
                ]);
                exit;
            }
        }
        // Assignation à un infirmier (soins infirmiers uniquement)
        $sql = 'UPDATE appointments SET assigned_nurse_id = :assigned_nurse_id, assigned_lab_id = NULL, assigned_to = NULL, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_nurse_id' => $assignedNurseId,
            ':id' => $appointmentId,
        ]);
        $deferredLog = ['user' => $user, 'appointmentId' => $appointmentId, 'details' => ['assigned_nurse_id' => $assignedNurseId]];
        $responseData = ['success' => true, 'data' => ['assigned_nurse_id' => $assignedNurseId]];
    } else {
        // Legacy: assigned_to (préleveur / sous-compte) — prise de sang uniquement
        $sql = 'UPDATE appointments SET assigned_to = :assigned_to, updated_at = NOW() WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':assigned_to' => $assignedTo,
            ':id' => $appointmentId,
        ]);
        $deferredLog = ['user' => $user, 'appointmentId' => $appointmentId, 'details' => ['new_assigned_to' => $assignedTo]];
        // Email au préleveur (async)
        EmailQueue::add('assigned_to_preleveur', null, [
            'appointment_id' => $appointmentId,
            'scheduled_at' => $appointment['scheduled_at'] ?? null,
        ], $assignedTo);
        $responseData = ['success' => true, 'data' => ['assigned_to' => $assignedTo]];
    }

    if (!isset($responseData)) {
        $responseData = ['success' => true];
    }
    echo json_encode($responseData);
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        flush();
    }
    // Enregistrer le log après envoi de la réponse (ne bloque pas l’utilisateur)
    if ($deferredLog !== null) {
        try {
            $logger = new Logger();
            $logger->log(
                $deferredLog['user']['user_id'] ?? null,
                $deferredLog['user']['role'] ?? null,
                'reassign_appointment',
                'appointment',
                $deferredLog['appointmentId'] ?? null,
                $deferredLog['details'] ?? null
            );
        } catch (Throwable $e) {
            error_log('Reassign deferred log failed: ' . $e->getMessage());
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
