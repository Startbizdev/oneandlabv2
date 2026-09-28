<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/AppointmentCancellationPolicy.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
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
        
        $accessContext = AppointmentDetailAccess::loadAccessContext($db, $id);
        if ($accessContext === null) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
        }
        $id = $accessContext['id'];
        $appointmentCheck = $accessContext['row'];
        $hasCreationBatchColumn = $accessContext['has_creation_batch_column'];
        $shareTokenGet = isset($_GET['share_token']) ? trim((string) $_GET['share_token']) : '';

        $hasAccess = AppointmentDetailAccess::userHasDetailAccess(
            $db,
            $user,
            $appointmentCheck,
            $id,
            $hasCreationBatchColumn,
            $shareTokenGet !== '' ? $shareTokenGet : null
        );

        if (!$hasAccess) {
            AppointmentDetailAccess::respondForbiddenOrExit($db, $user, $appointmentCheck);
        }

        AppointmentDetailAccess::materializeShareOffersForNurse($db, $user, $id, $shareTokenGet !== '' ? $shareTokenGet : null);

        $include = isset($_GET['include']) ? trim((string) $_GET['include']) : '';
        $appointment = AppointmentDetailGetPayload::loadWithOptionalBatch(
            $appointmentModel,
            $user,
            $id,
            $include
        );

        if (!$appointment) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous introuvable',
                'code' => 'NOT_FOUND',
            ]);
            exit;
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
                    require_once __DIR__ . '/../../lib/NurseMonthlyAllowance.php';
                    $count = NurseMonthlyAllowance::count($dbCheck, $user['user_id'], null, $id);
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
            $allowPatientSchedulePatch = false;
            if (($user['role'] ?? '') === 'nurse' && AppointmentDetailPatchRules::isNurseReschedulePatch($input)) {
                $config = require __DIR__ . '/../../config/database.php';
                $dsn = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset'],
                );
                $dbNursePatch = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                $allowNursePassagePatch = AppointmentDetailPatchRules::nurseAssignedToNursing(
                    $dbNursePatch,
                    $id,
                    (string) ($user['user_id'] ?? ''),
                );
            }
            if (($user['role'] ?? '') === 'patient' && AppointmentDetailPatchRules::isScheduleOnlyPatch($input)) {
                $config = require __DIR__ . '/../../config/database.php';
                $dsn = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset'],
                );
                $dbPatientPatch = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
                $allowPatientSchedulePatch = AppointmentDetailPatchRules::patientOwnsPending(
                    $dbPatientPatch,
                    $id,
                    (string) ($user['user_id'] ?? ''),
                );
            }
            if (!$allowNursePassagePatch && !$allowPatientSchedulePatch) {
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
            $acceptedViaShareToken = null;
            if ($redispatch && $input['status'] !== 'pending') {
                throw new Exception('Le redispatch nécessite un statut "pending"');
            }
            if ($redispatch && !in_array($user['role'], ['nurse', 'lab', 'subaccount', 'super_admin'], true)) {
                throw new Exception('Seuls les professionnels de santé assignés ou l\'administration peuvent redispatcher un rendez-vous');
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
                if (
                    $user['role'] !== 'super_admin'
                    && !AppointmentDetailPatchRules::canStaffSetCompletedOrInProgressWithDb($dbPerm, $user, $aptPerm)
                ) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Vous ne pouvez terminer que les rendez-vous qui vous sont assignés ou que vous avez créés']);
                    exit;
                }
            }

            // Annulation par un pro : motif + commentaire obligatoires
            $cancellationReason = null;
            $cancellationComment = null;
            $cancellationPhotoDocumentId = null;
            if ($input['status'] === 'canceled' && in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'], true)) {
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
                    if (!AppointmentCancellationPolicy::canStaffCancel($user, $apt)) {
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
                        $acceptedViaShareToken = $shareTokPut;
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
            if (
                !$declinedOffer
                && isset($input['status'])
                && $input['status'] === 'confirmed'
                && ($user['role'] ?? '') === 'nurse'
                && !empty($acceptedViaShareToken)
            ) {
                require_once __DIR__ . '/../../lib/admin/AdminDispatchEventLogger.php';
                $configPut = require __DIR__ . '/../../config/database.php';
                $dsnPut = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $configPut['host'],
                    $configPut['port'],
                    $configPut['database'],
                    $configPut['charset']
                );
                $dbPut = new PDO($dsnPut, $configPut['username'], $configPut['password'], $configPut['options'] ?? []);
                $tokStmt = $dbPut->prepare('SELECT id FROM appointment_share_tokens WHERE token = ? AND appointment_id = ? LIMIT 1');
                $tokStmt->execute([$acceptedViaShareToken, $id]);
                $tokRow = $tokStmt->fetch(PDO::FETCH_ASSOC);
                $dispatchLog = new AdminDispatchEventLogger($dbPut);
                $dispatchLog->log(
                    $id,
                    'offer_accepted_via_share_token',
                    $user['user_id'],
                    $user['role'],
                    $user['user_id'],
                    [
                        'share_token_id' => $tokRow['id'] ?? null,
                    ]
                );
            }
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
        http_response_code($e instanceof NurseQuotaExceeded ? 403 : 400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => $e instanceof NurseQuotaExceeded ? 'PLAN_LIMIT' : 'VALIDATION_ERROR',
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

