<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/EmailQueue.php';
require_once __DIR__ . '/../../../lib/LabTeamAccess.php';

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
$roleMiddleware->handle($user, ['super_admin', 'lab', 'subaccount']);

$csrfMiddleware = new CSRFMiddleware();
$csrfMiddleware->handle();

// ID du RDV : priorité au paramètre injecté par le routeur, sinon extraction depuis l'URL
$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    $pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '', '/'));
    $idx = array_search('appointments', $pathParts);
    $appointmentId = ($idx !== false && isset($pathParts[$idx + 1])) ? $pathParts[$idx + 1] : null;
}

if (!$appointmentId || $appointmentId === 'reassign') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$assignedTo = isset($input['assigned_to']) ? trim((string) $input['assigned_to']) : null;
$assignedLabId = isset($input['assigned_lab_id']) ? trim((string) $input['assigned_lab_id']) : null;
$assignedNurseId = isset($input['assigned_nurse_id']) ? trim((string) $input['assigned_nurse_id']) : null;
if ($assignedTo === '') $assignedTo = null;
if ($assignedLabId === '') $assignedLabId = null;
if ($assignedNurseId === '') $assignedNurseId = null;

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
/** Utilisateur à notifier (nouveau préleveur / infirmier / lab ciblé) */
$reassignNotifyUserId = null;
/** Patient à notifier quand un préleveur est nouvellement assigné (évite doublon si inchangé) */
$deferredPatientPreleveurNotify = null;

try {
    // Récupérer le type, la date patient, catégorie et assigned_to (état avant UPDATE)
    $checkStmt = $pdo->prepare('SELECT type, scheduled_at, patient_id, category_id, assigned_to FROM appointments WHERE id = ?');
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
        if ($currentAssignedLabId !== null && $currentAssignedLabId !== $user['user_id']) {
            $teamIds = LabTeamAccess::teamMemberIds($pdo, $user['user_id'], $user['role'] ?? '');
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
            $reassignNotifyUserId = $ato;
            EmailQueue::add('assigned_to_preleveur', null, [
                'appointment_id' => $appointmentId,
                'scheduled_at' => $appointment['scheduled_at'] ?? null,
            ], $ato);
        } elseif ($assignedLabId !== null && $assignedLabId !== '' && (string) $assignedLabId !== (string) ($user['user_id'] ?? '')) {
            $reassignNotifyUserId = $assignedLabId;
        }
        if (
            $ato
            && !empty($appointment['patient_id'])
            && (string) ($appointment['assigned_to'] ?? '') !== (string) $ato
        ) {
            $deferredPatientPreleveurNotify = [
                'patient_id' => (string) $appointment['patient_id'],
                'preleveur_id' => $ato,
            ];
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
        $maxPerMonth = array_key_exists('max_appointments_per_month', $nurseLimits)
            ? $nurseLimits['max_appointments_per_month']
            : ($limits['nurse']['discovery']['max_appointments_per_month'] ?? 10);
        if ($maxPerMonth !== null) {
            $tz = new DateTimeZone('Europe/Paris');
            $now = new DateTime('now', $tz);
            $monthStart = $now->format('Y-m-01 00:00:00');
            $monthEnd = $now->format('Y-m-t 23:59:59');
            $stmtCount = $pdo->prepare('
                SELECT COUNT(*) FROM (
                    SELECT a.id FROM appointments a
                    LEFT JOIN (
                        SELECT appointment_id, MIN(created_at) as first_accepted_at
                        FROM appointment_status_updates
                        WHERE status = \'confirmed\' AND actor_role = \'nurse\' AND actor_id = ?
                        GROUP BY appointment_id
                    ) u ON u.appointment_id = a.id
                    WHERE a.assigned_nurse_id = ?
                    AND a.status NOT IN (\'canceled\', \'refused\')
                    AND (
                        (u.first_accepted_at IS NOT NULL AND u.first_accepted_at >= ? AND u.first_accepted_at <= ?)
                        OR (u.first_accepted_at IS NULL AND a.scheduled_at >= ? AND a.scheduled_at <= ?)
                    )
                ) x
            ');
            $stmtCount->execute([$assignedNurseId, $assignedNurseId, $monthStart, $monthEnd, $monthStart, $monthEnd]);
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
        $reassignNotifyUserId = $assignedNurseId;
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
        $reassignNotifyUserId = $assignedTo;
        // Email au préleveur (async)
        EmailQueue::add('assigned_to_preleveur', null, [
            'appointment_id' => $appointmentId,
            'scheduled_at' => $appointment['scheduled_at'] ?? null,
        ], $assignedTo);
        if (
            $assignedTo
            && !empty($appointment['patient_id'])
            && (string) ($appointment['assigned_to'] ?? '') !== (string) $assignedTo
        ) {
            $deferredPatientPreleveurNotify = [
                'patient_id' => (string) $appointment['patient_id'],
                'preleveur_id' => $assignedTo,
            ];
        }
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
    if (!empty($reassignNotifyUserId) || $deferredPatientPreleveurNotify !== null) {
        try {
            require_once __DIR__ . '/../../../lib/NotificationService.php';
            require_once __DIR__ . '/../../../lib/NotificationMessageFormatter.php';
            require_once __DIR__ . '/../../../lib/Crypto.php';
            require_once __DIR__ . '/../../../models/User.php';
            $ns = new NotificationService();
            $um = new User();

            if (!empty($reassignNotifyUserId)) {
                $stmtA = $pdo->prepare(
                    'SELECT type, scheduled_at, patient_id, category_id, form_data_encrypted, form_data_dek FROM appointments WHERE id = ?'
                );
                $stmtA->execute([$appointmentId]);
                $rowA = $stmtA->fetch(PDO::FETCH_ASSOC);
                $patientName = '';
                if ($rowA && !empty($rowA['patient_id'])) {
                    $p = $um->getById((string) $rowA['patient_id'], 'system', 'system');
                    if ($p) {
                        $patientName = trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));
                    }
                }
                $catName = null;
                if ($rowA && !empty($rowA['category_id'])) {
                    $cSt = $pdo->prepare('SELECT name FROM care_categories WHERE id = ? LIMIT 1');
                    $cSt->execute([$rowA['category_id']]);
                    $cr = $cSt->fetch(PDO::FETCH_ASSOC);
                    if ($cr && !empty($cr['name'])) {
                        $catName = $cr['name'];
                    }
                }
                $formData = null;
                if ($rowA && !empty($rowA['form_data_encrypted']) && !empty($rowA['form_data_dek'])) {
                    try {
                        $crypto = new Crypto();
                        $json = $crypto->decryptField($rowA['form_data_encrypted'], $rowA['form_data_dek']);
                        $decoded = json_decode($json, true);
                        $formData = is_array($decoded) ? $decoded : null;
                    } catch (Throwable $e) {
                        $formData = null;
                    }
                }
                $schedLabel = $rowA
                    ? NotificationMessageFormatter::whenShort($formData, $rowA['scheduled_at'] ?? null)
                    : '';
                $ns->notifyAppointmentReassigned(
                    (string) $reassignNotifyUserId,
                    $appointmentId,
                    (string) ($rowA['type'] ?? ''),
                    $patientName,
                    $schedLabel,
                    $catName
                );
            }

            if ($deferredPatientPreleveurNotify !== null) {
                $prel = $um->getById($deferredPatientPreleveurNotify['preleveur_id'], 'system', 'system');
                $first = $prel ? trim((string) ($prel['first_name'] ?? '')) : '';
                $last = $prel ? trim((string) ($prel['last_name'] ?? '')) : '';
                $full = trim($first . ' ' . $last);
                $ns->notifyPatientPreleveurAssigned(
                    $deferredPatientPreleveurNotify['patient_id'],
                    $appointmentId,
                    $deferredPatientPreleveurNotify['preleveur_id'],
                    $full
                );
            }
        } catch (Throwable $e) {
            error_log('Reassign notification: ' . $e->getMessage());
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
