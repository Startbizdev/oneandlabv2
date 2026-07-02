<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

/**
 * PATCH créneau passage infirmier (form_data + scheduled_at) — pas une refonte admin complète.
 */
function appointment_is_nurse_passage_schedule_patch(array $input): bool
{
    if (isset($input['address']) || isset($input['status']) || isset($input['category_id'])) {
        return false;
    }
    foreach (array_keys($input) as $key) {
        if (!in_array($key, ['form_data', 'scheduled_at'], true)) {
            return false;
        }
    }

    return isset($input['form_data']) || isset($input['scheduled_at']);
}

function appointment_nurse_assigned_to_nursing(PDO $db, string $appointmentId, string $nurseId): bool
{
    $stmt = $db->prepare("
        SELECT id FROM appointments
        WHERE id = ? AND type = 'nursing' AND assigned_nurse_id = ?
          AND status IN ('confirmed', 'inProgress', 'planned', 'completed')
        LIMIT 1
    ");
    $stmt->execute([$appointmentId, $nurseId]);

    return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Vérifier CSRF pour les requêtes modifiantes
if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    CSRFMiddleware::handle();
}

$appointmentModel = new Appointment();

// Extraire l'ID depuis l'URL (nécessite un routeur, pour l'instant on utilise $_GET)
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Détails d'un rendez-vous
    try {
        // Vérifier les permissions avant de récupérer le rendez-vous
        require_once __DIR__ . '/../../config/database.php';
        $config = require __DIR__ . '/../../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        
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
        try {
            $hasCreationBatchColumn = (bool) $db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'creation_batch_id'
            ")->fetchColumn();
        } catch (Throwable $e) {
            $hasCreationBatchColumn = false;
        }
        $mergedSelect = $hasMergedColumn ? ', merged_into_appointment_id' : '';
        $creationBatchSelect = $hasCreationBatchColumn ? ', creation_batch_id' : '';
        $stmt = $db->prepare("
            SELECT patient_id, assigned_nurse_id, assigned_lab_id, assigned_to, created_by, type, status, location_lat, location_lng{$creationBatchSelect}{$mergedSelect}
            FROM appointments
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $appointmentCheck = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$appointmentCheck) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        if (!empty($appointmentCheck['merged_into_appointment_id'])) {
            $id = (string) $appointmentCheck['merged_into_appointment_id'];
            $stmt->execute([$id]);
            $appointmentCheck = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$appointmentCheck) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable', 'code' => 'NOT_FOUND']);
                exit;
            }
        }
        
        // Vérifier les permissions d'accès de base
        $hasAccess = (
            $appointmentCheck['patient_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_nurse_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_lab_id'] === $user['user_id'] ||
            (!empty($appointmentCheck['assigned_to']) && $appointmentCheck['assigned_to'] === $user['user_id']) ||
            $appointmentCheck['created_by'] === $user['user_id'] ||
            $user['role'] === 'super_admin'
        );
        
        // Infirmier : pas d'accès aux blood_test créés par d'autres (seulement nursing ou blood_test créés par lui)
        if ($user['role'] === 'nurse' && $appointmentCheck['type'] === 'blood_test' && $appointmentCheck['created_by'] !== $user['user_id']) {
            $hasAccess = false;
        }
        
        // Les préleveurs ne peuvent accéder qu'aux rendez-vous de type "blood_test".
        if ($user['role'] === 'preleveur' && $appointmentCheck['type'] !== 'blood_test') {
            $hasAccess = false;
        }

        if (!$hasAccess && $user['role'] === 'preleveur' && $appointmentCheck['type'] === 'blood_test') {
            $prelLabStmt = $db->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
            $prelLabStmt->execute([$user['user_id']]);
            $prelLabId = (string) ($prelLabStmt->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
            $assignedTo = (string) ($appointmentCheck['assigned_to'] ?? '');
            $assignedLab = (string) ($appointmentCheck['assigned_lab_id'] ?? '');
            if ($assignedTo !== '' && $assignedTo === (string) $user['user_id']) {
                $hasAccess = true;
            }
            if (
                !$hasAccess
                && $appointmentCheck['status'] === 'pending'
                && $assignedTo === ''
                && $prelLabId !== ''
                && $assignedLab === $prelLabId
            ) {
                $hasAccess = true;
            }
            if (!$hasAccess && $appointmentCheck['status'] === 'pending') {
                $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                $offerStmt->execute([$id, $user['user_id']]);
                if ($offerStmt->fetch()) {
                    $hasAccess = true;
                }
            }
        }
        
        // Lab / sous-compte : accès si le RDV est assigné à l'équipe (lab parent inclus pour les sous-comptes) ou offre pending
        if (!$hasAccess && in_array($user['role'], ['lab', 'subaccount'], true) && $appointmentCheck['type'] === 'blood_test') {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (in_array($appointmentCheck['assigned_lab_id'], $teamIds, true)) {
                $hasAccess = true;
            }
            if (!$hasAccess && !empty($appointmentCheck['assigned_to']) && in_array($appointmentCheck['assigned_to'], $teamIds, true)) {
                $hasAccess = true;
            }
            if (!$hasAccess && empty($appointmentCheck['assigned_lab_id']) && $appointmentCheck['status'] === 'pending') {
                $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                foreach ($teamIds as $tid) {
                    $offerStmt->execute([$id, $tid]);
                    if ($offerStmt->fetch()) {
                        $hasAccess = true;
                        break;
                    }
                }
            }
        }
        
        // Infirmier : accès si assigné à lui OU si RDV offert (pending, dans appointment_offers) OU sibling de lot OU jeton de partage valide
        if (!$hasAccess && $user['role'] === 'nurse' && $appointmentCheck['type'] === 'nursing' &&
            $appointmentCheck['status'] === 'pending' && empty($appointmentCheck['assigned_nurse_id'])) {
            $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
            $offerStmt->execute([$id, $user['user_id']]);
            if ($offerStmt->fetch()) {
                $hasAccess = true;
            } else {
                // Accès sibling de lot : si l'infirmier a une offre pour n'importe quel RDV du même lot, il accède à tous les siblings
                $batchIdForAccess = $hasCreationBatchColumn ? ($appointmentCheck['creation_batch_id'] ?? null) : null;
                if (!empty($batchIdForAccess)) {
                    $batchOfferStmt = $db->prepare('
                        SELECT 1 FROM appointment_offers ao
                        INNER JOIN appointments a ON ao.appointment_id = a.id
                        WHERE ao.profile_id = ? AND a.creation_batch_id = ? AND a.type = \'nursing\'
                        LIMIT 1
                    ');
                    $batchOfferStmt->execute([$user['user_id'], $batchIdForAccess]);
                    if ($batchOfferStmt->fetch()) {
                        $hasAccess = true;
                    }
                }
                if (!$hasAccess) {
                    $shareTokenGet = isset($_GET['share_token']) ? trim((string) $_GET['share_token']) : '';
                    if ($shareTokenGet !== '') {
                        require_once __DIR__ . '/../../lib/AppointmentShareToken.php';
                        if (AppointmentShareToken::grantsNurseShareAccess($db, $shareTokenGet, $id)) {
                            $hasAccess = true;
                        }
                    }
                }
            }
        }

        // Infirmier créateur : plus d'accès au détail si un autre infirmier est assigné (refus / redispatch puis acceptation par un confrère)
        if ($user['role'] === 'nurse' && ($appointmentCheck['type'] ?? '') === 'nursing'
            && !empty($appointmentCheck['assigned_nurse_id'])
            && (string) $appointmentCheck['assigned_nurse_id'] !== (string) $user['user_id']
        ) {
            $hasAccess = false;
        }
        
        if (!$hasAccess) {
            require_once __DIR__ . '/../../lib/AppointmentDetailGate.php';
            AppointmentDetailGate::respondWhenForbidden(
                $db,
                $appointmentCheck,
                (string) $user['user_id'],
                (string) $user['role'],
            );
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Accès refusé à ce rendez-vous',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }

        // Lien partagé : matérialiser les offres pour l’infirmier (lot + liste « Mes demandes »)
        $shareTokenMaterialize = isset($_GET['share_token']) ? trim((string) $_GET['share_token']) : '';
        if ($user['role'] === 'nurse' && $shareTokenMaterialize !== '') {
            require_once __DIR__ . '/../../lib/AppointmentShareToken.php';
            if (AppointmentShareToken::grantsNurseShareAccess($db, $shareTokenMaterialize, $id)) {
                AppointmentShareToken::materializeOffersForNurseFromShare($db, $user['user_id'], $id);
            }
        }

        $appointment = $appointmentModel->getById($id, $user['user_id'], $user['role']);

        $include = isset($_GET['include']) ? trim((string) $_GET['include']) : '';
        if ($appointment && str_contains($include, 'batch')) {
            $siblings = $appointment['batch_siblings'] ?? [];
            $batchAppointments = [];
            if (is_array($siblings) && count($siblings) > 0) {
                foreach ($siblings as $sib) {
                    $sibId = is_array($sib) ? ($sib['id'] ?? null) : null;
                    if (!$sibId || (string) $sibId === (string) $id) {
                        continue;
                    }
                    $sibFull = $appointmentModel->getById((string) $sibId, $user['user_id'], $user['role']);
                    if ($sibFull) {
                        $batchAppointments[] = $sibFull;
                    }
                }
            }
            $appointment['batch_appointments'] = $batchAppointments;
        }
        
        if (!$appointment) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }

        require_once __DIR__ . '/../../lib/AppointmentListPayload.php';
        $appointment = AppointmentListPayload::enrichProfileMediaForDetail($appointment);
        if (!empty($appointment['batch_appointments']) && is_array($appointment['batch_appointments'])) {
            foreach ($appointment['batch_appointments'] as $idx => $batchApt) {
                if (is_array($batchApt)) {
                    $appointment['batch_appointments'][$idx] = AppointmentListPayload::enrichProfileMediaForDetail($batchApt);
                }
            }
        }

        // Logger la consultation de rendez-vous (HDS)
        require_once __DIR__ . '/../../lib/Logger.php';
        $logger = new Logger();
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'appointment',
            $id,
            [
                'status' => $appointment['status'],
                'type' => $appointment['type'],
                'has_relative' => !empty($appointment['relative']),
                'has_sensitive_data' => !empty($appointment['address']) || !empty($appointment['form_data'])
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => $appointment,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Données invalides']);
        exit;
    }

    $isFullUpdate = isset($input['form_data']) || isset($input['scheduled_at']) || isset($input['address']);

    $declinedOffer = false;
    try {
        // Limite 10 RDV/mois pour infirmiers en offre Découverte (avant assignation)
        if (!$isFullUpdate && isset($input['status']) && $input['status'] === 'confirmed' && $user['role'] === 'nurse') {
            $config = require __DIR__ . '/../../config/database.php';
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
            $dbCheck = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
            $stmtApt = $dbCheck->prepare('SELECT type, assigned_nurse_id FROM appointments WHERE id = ?');
            $stmtApt->execute([$id]);
            $apt = $stmtApt->fetch(PDO::FETCH_ASSOC);
            if ($apt && ($apt['type'] ?? '') === 'nursing') {
                require_once __DIR__ . '/../../lib/SubscriptionService.php';
                $subscriptionService = new SubscriptionService($dbCheck);
                $planSlug = $subscriptionService->getActiveNursePlan($user['user_id']);
                $limits = require __DIR__ . '/../../config/plan-limits.php';
                $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];
                // null = illimité (nurse_pro) — ne pas utiliser ?? 10 qui remplace null par 10
                $maxPerMonth = array_key_exists('max_appointments_per_month', $nurseLimits)
                    ? $nurseLimits['max_appointments_per_month']
                    : ($limits['nurse']['discovery']['max_appointments_per_month'] ?? 10);
                if ($maxPerMonth !== null) {
                    $tz = new DateTimeZone('Europe/Paris');
                    $now = new DateTime('now', $tz);
                    $monthStart = $now->format('Y-m-01 00:00:00');
                    $monthEnd = $now->format('Y-m-t 23:59:59');
                    $stmtCount = $dbCheck->prepare('
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
                    $stmtCount->execute([$user['user_id'], $user['user_id'], $monthStart, $monthEnd, $monthStart, $monthEnd]);
                    $count = (int) $stmtCount->fetchColumn();
                    if ($count >= $maxPerMonth) {
                        http_response_code(403);
                        echo json_encode([
                            'success' => false,
                            'error' => "Vous avez atteint la limite de {$maxPerMonth} rendez-vous ce mois (offre Découverte). Passez à l'offre Pro pour des rendez-vous illimités.",
                            'code' => 'PLAN_LIMIT',
                        ]);
                        exit;
                    }
                }
            }
        }

        if ($isFullUpdate) {
            $allowNursePassagePatch = false;
            if (($user['role'] ?? '') === 'nurse' && appointment_is_nurse_passage_schedule_patch($input)) {
                $config = require __DIR__ . '/../../config/database.php';
                $dsn = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset'],
                );
                $dbNursePatch = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                $allowNursePassagePatch = appointment_nurse_assigned_to_nursing(
                    $dbNursePatch,
                    $id,
                    (string) ($user['user_id'] ?? ''),
                );
            }
            if (!$allowNursePassagePatch) {
                require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
                $roleMiddleware = new RoleMiddleware();
                $roleMiddleware->handle($user, ['super_admin']);
            }
            // S'assurer que category_id est à la racine (le modèle le lit là)
            if (!isset($input['category_id']) && !empty($input['form_data']['category_id'])) {
                $input['category_id'] = $input['form_data']['category_id'];
            }
            $appointmentModel->update($id, $input, $user['user_id'], $user['role']);
        } else {
            if (!isset($input['status'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Statut requis']);
                exit;
            }
            $redispatch = isset($input['redispatch']) && $input['redispatch'] === true;
            if ($redispatch && $input['status'] !== 'pending') {
                throw new Exception('Le redispatch nécessite un statut "pending"');
            }
            if ($redispatch && !in_array($user['role'], ['nurse', 'lab', 'subaccount'])) {
                throw new Exception('Seuls les professionnels de santé assignés peuvent redispatcher un rendez-vous');
            }

            // Pour completed / inProgress : vérifier que l'utilisateur est assigné, créateur, ou (pour lab) dans l'équipe du RDV
            if (in_array($input['status'], ['completed', 'inProgress'], true)) {
                $config = require __DIR__ . '/../../config/database.php';
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
                $dbPerm = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                $stmtPerm = $dbPerm->prepare('SELECT assigned_nurse_id, assigned_lab_id, assigned_to, created_by FROM appointments WHERE id = ?');
                $stmtPerm->execute([$id]);
                $aptPerm = $stmtPerm->fetch(PDO::FETCH_ASSOC);
                if (!$aptPerm) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
                    exit;
                }
                if ($user['role'] !== 'super_admin') {
                    $isAssigned = ($aptPerm['assigned_nurse_id'] === $user['user_id'])
                        || ($aptPerm['assigned_lab_id'] === $user['user_id'])
                        || ($aptPerm['assigned_to'] === $user['user_id']);
                    $isProCreator = ($user['role'] === 'pro' && ($aptPerm['created_by'] ?? null) === $user['user_id']);
                    $isLabTeam = false;
                    if (!$isAssigned && !$isProCreator && in_array($user['role'], ['lab', 'subaccount'], true)) {
                        $teamIds = LabTeamAccess::teamMemberIds($dbPerm, $user['user_id'], $user['role']);
                        $isLabTeam = in_array($aptPerm['assigned_lab_id'], $teamIds, true) || in_array($aptPerm['assigned_to'], $teamIds, true);
                    }
                    if (!$isAssigned && !$isProCreator && !$isLabTeam) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'error' => 'Vous ne pouvez terminer que les rendez-vous qui vous sont assignés ou que vous avez créés']);
                        exit;
                    }
                }
            }

            // Annulation par un pro : motif + commentaire obligatoires
            $cancellationReason = null;
            $cancellationComment = null;
            $cancellationPhotoDocumentId = null;
            if ($input['status'] === 'canceled' && in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'])) {
                $reasons = require __DIR__ . '/../../config/cancellation-reasons.php';
                $cancellationReason = isset($input['cancellation_reason']) ? trim((string) $input['cancellation_reason']) : '';
                $cancellationComment = isset($input['cancellation_comment']) ? trim((string) $input['cancellation_comment']) : '';
                if ($cancellationReason === '' || !isset($reasons[$cancellationReason])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Raison d\'annulation obligatoire et invalide']);
                    exit;
                }
                if (strlen($cancellationComment) < 10) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Le commentaire doit faire au moins 10 caractères']);
                    exit;
                }
                $cancellationPhotoDocumentId = !empty($input['cancellation_photo_document_id']) ? trim((string) $input['cancellation_photo_document_id']) : null;
                // Photo autorisée uniquement pour wrong_address et access_impossible
                if ($cancellationPhotoDocumentId !== null && !in_array($cancellationReason, ['wrong_address', 'access_impossible'], true)) {
                    $cancellationPhotoDocumentId = null;
                }
                // Vérifier les droits d'annulation (sauf super_admin)
                if ($user['role'] !== 'super_admin') {
                    $config = require __DIR__ . '/../../config/database.php';
                    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
                    $dbCancel = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                    $stmtCheck = $dbCancel->prepare('SELECT created_by, assigned_nurse_id, assigned_lab_id, assigned_to FROM appointments WHERE id = ?');
                    $stmtCheck->execute([$id]);
                    $apt = $stmtCheck->fetch(PDO::FETCH_ASSOC);
                    if (!$apt) {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
                        exit;
                    }
                    $isProCreator = ($user['role'] === 'pro' && ($apt['created_by'] ?? null) === $user['user_id']);
                    $isAssigned = ($apt['assigned_nurse_id'] === $user['user_id'])
                        || ($apt['assigned_lab_id'] === $user['user_id'])
                        || ($apt['assigned_to'] === $user['user_id']);
                    if (!$isProCreator && !$isAssigned) {
                        http_response_code(403);
                        echo json_encode(['success' => false, 'error' => 'Vous ne pouvez annuler que les rendez-vous que vous avez créés ou qui vous sont assignés']);
                        exit;
                    }
                }
            }

            // Infirmier : accepter un RDV « partage lien » sans être dans la zone (appointment_offers)
            if (
                !$isFullUpdate
                && isset($input['status'])
                && $input['status'] === 'confirmed'
                && $user['role'] === 'nurse'
            ) {
                require_once __DIR__ . '/../../lib/AppointmentShareToken.php';
                $configPut = require __DIR__ . '/../../config/database.php';
                $dsnPut = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $configPut['host'],
                    $configPut['port'],
                    $configPut['database'],
                    $configPut['charset']
                );
                $dbPut = new PDO($dsnPut, $configPut['username'], $configPut['password'], $configPut['options'] ?? []);
                $stmtPut = $dbPut->prepare('SELECT type, status, assigned_nurse_id FROM appointments WHERE id = ?');
                $stmtPut->execute([$id]);
                $aptPut = $stmtPut->fetch(PDO::FETCH_ASSOC);
                if (
                    $aptPut
                    && ($aptPut['type'] ?? '') === 'nursing'
                    && ($aptPut['status'] ?? '') === 'pending'
                    && empty($aptPut['assigned_nurse_id'])
                ) {
                    $offerStmtPut = $dbPut->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                    $offerStmtPut->execute([$id, $user['user_id']]);
                    $hasOfferPut = $offerStmtPut->fetch() !== false;
                    if (!$hasOfferPut) {
                        $shareTokPut = trim((string) ($input['share_token'] ?? ''));
                        if ($shareTokPut === '' || !AppointmentShareToken::grantsNurseShareAccess($dbPut, $shareTokPut, $id)) {
                            http_response_code(403);
                            echo json_encode([
                                'success' => false,
                                'error' => 'Ce rendez-vous ne vous est pas proposé. Utilisez le lien de partage reçu.',
                                'code' => 'NO_OFFER_NO_TOKEN',
                            ]);
                            exit;
                        }
                    }
                }
            }

            if (
                !$isFullUpdate
                && isset($input['status'])
                && $input['status'] === 'confirmed'
                && $user['role'] === 'preleveur'
            ) {
                $configPut = require __DIR__ . '/../../config/database.php';
                $dsnPut = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $configPut['host'],
                    $configPut['port'],
                    $configPut['database'],
                    $configPut['charset']
                );
                $dbPut = new PDO($dsnPut, $configPut['username'], $configPut['password'], $configPut['options'] ?? []);
                $stmtPrel = $dbPut->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
                $stmtPrel->execute([$user['user_id']]);
                $prelLabId = (string) ($stmtPrel->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
                $stmtPut = $dbPut->prepare('SELECT type, status, assigned_lab_id, assigned_to FROM appointments WHERE id = ?');
                $stmtPut->execute([$id]);
                $aptPut = $stmtPut->fetch(PDO::FETCH_ASSOC);
                if (
                    !$aptPut
                    || ($aptPut['type'] ?? '') !== 'blood_test'
                    || ($aptPut['status'] ?? '') !== 'pending'
                ) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Ce rendez-vous ne peut pas être repris par un préleveur.']);
                    exit;
                }
                $assignedToPut = (string) ($aptPut['assigned_to'] ?? '');
                $assignedLabPut = (string) ($aptPut['assigned_lab_id'] ?? '');
                $offerStmtPut = $dbPut->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                $offerStmtPut->execute([$id, $user['user_id']]);
                $hasOfferPut = $offerStmtPut->fetch() !== false;
                $allowedByAssignment =
                    ($assignedToPut !== '' && $assignedToPut === (string) $user['user_id'])
                    || ($assignedToPut === '' && $prelLabId !== '' && $assignedLabPut === $prelLabId);
                if (!$hasOfferPut && !$allowedByAssignment) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Ce rendez-vous ne vous est pas proposé ou n’appartient pas à votre laboratoire.']);
                    exit;
                }
            }

            $statusResult = $appointmentModel->updateStatus(
                $id,
                $input['status'],
                $user['user_id'],
                $user['role'],
                $input['note'] ?? $cancellationComment,
                $redispatch,
                $cancellationReason,
                $cancellationComment,
                $cancellationPhotoDocumentId
            );
            $declinedOffer = ($statusResult === 'declined_offer');
            if ($redispatch) {
                require_once __DIR__ . '/../../lib/Logger.php';
                $logger = new Logger();
                $logger->log($user['user_id'], $user['role'], 'redispatch', 'appointment', $id, [
                    'action' => 'redispatch',
                    'reason' => 'professional_unavailable'
                ]);
            }
        }
        echo json_encode([
            'success' => true,
            'declined_offer' => $declinedOffer,
        ]);
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            flush();
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'VALIDATION_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Suppression réservée au super_admin (liste admin rendez-vous)
    if ($user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Suppression réservée à l\'administrateur']);
        exit;
    }
    require_once __DIR__ . '/../../config/database.php';
    $config = require __DIR__ . '/../../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    $stmt = $db->prepare('SELECT id FROM appointments WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
        exit;
    }
    $del = $db->prepare('DELETE FROM appointments WHERE id = ?');
    $del->execute([$id]);
    echo json_encode(['success' => true]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

