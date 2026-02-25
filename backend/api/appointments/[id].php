<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../config/cors.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
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
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
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
        
        $stmt = $db->prepare('
            SELECT patient_id, assigned_nurse_id, assigned_lab_id, assigned_to, created_by, type, status, location_lat, location_lng
            FROM appointments
            WHERE id = ?
        ');
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
        
        // Vérifier les permissions d'accès de base
        $hasAccess = (
            $appointmentCheck['patient_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_nurse_id'] === $user['user_id'] ||
            $appointmentCheck['assigned_lab_id'] === $user['user_id'] ||
            (!empty($appointmentCheck['assigned_to']) && $appointmentCheck['assigned_to'] === $user['user_id']) ||
            $appointmentCheck['created_by'] === $user['user_id'] ||
            $user['role'] === 'super_admin'
        );
        
        // Les infirmiers ne peuvent accéder qu'aux rendez-vous de type "nursing"
        if ($user['role'] === 'nurse' && $appointmentCheck['type'] !== 'nursing') {
            $hasAccess = false;
        }
        
        // Les préleveurs ne peuvent accéder qu'aux rendez-vous de type "blood_test" (et doivent être assignés ou lab du préleveur)
        if ($user['role'] === 'preleveur' && $appointmentCheck['type'] !== 'blood_test') {
            $hasAccess = false;
        }
        
        // Lab : accès si assigné à l'équipe OU si RDV offert (pending, dans appointment_offers)
        if (!$hasAccess && $user['role'] === 'lab' && $appointmentCheck['type'] === 'blood_test') {
            $teamStmt = $db->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
            $teamStmt->execute([$user['user_id'], $user['user_id']]);
            $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
            if (in_array($appointmentCheck['assigned_lab_id'], $teamIds, true)) {
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
        
        // Sous-compte : accès si assigné à lui OU si RDV offert (pending, dans appointment_offers)
        if (!$hasAccess && $user['role'] === 'subaccount' && $appointmentCheck['type'] === 'blood_test' &&
            empty($appointmentCheck['assigned_lab_id']) && $appointmentCheck['status'] === 'pending') {
            $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
            $offerStmt->execute([$id, $user['user_id']]);
            if ($offerStmt->fetch()) {
                $hasAccess = true;
            }
        }
        
        // Infirmier : accès si assigné à lui OU si RDV offert (pending, dans appointment_offers)
        if (!$hasAccess && $user['role'] === 'nurse' && $appointmentCheck['type'] === 'nursing' &&
            $appointmentCheck['status'] === 'pending' && empty($appointmentCheck['assigned_nurse_id'])) {
            $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
            $offerStmt->execute([$id, $user['user_id']]);
            if ($offerStmt->fetch()) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            // Infirmier : RDV déjà accepté par un confrère → réponse dédiée (pas de détail, pas 403)
            if ($user['role'] === 'nurse' && $appointmentCheck['type'] === 'nursing') {
                $alreadyTaken = $appointmentCheck['status'] !== 'pending'
                    || (!empty($appointmentCheck['assigned_nurse_id']) && $appointmentCheck['assigned_nurse_id'] !== $user['user_id']);
                if ($alreadyTaken) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'alreadyAccepted' => true,
                    ]);
                    exit;
                }
            }
            // Lab / sous-compte : RDV prise de sang déjà accepté par un confrère → même approche
            if (($user['role'] === 'lab' || $user['role'] === 'subaccount') && $appointmentCheck['type'] === 'blood_test') {
                $alreadyTaken = $appointmentCheck['status'] !== 'pending'
                    || (!empty($appointmentCheck['assigned_lab_id']) && $appointmentCheck['assigned_lab_id'] !== $user['user_id']);
                if ($alreadyTaken) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'alreadyAccepted' => true,
                    ]);
                    exit;
                }
            }
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Accès refusé à ce rendez-vous',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        
        $appointment = $appointmentModel->getById($id, $user['user_id'], $user['role']);
        
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
                $stmtSub = $dbCheck->prepare('SELECT plan_slug FROM subscriptions WHERE user_id = ? AND status IN (\'active\', \'trialing\') ORDER BY updated_at DESC LIMIT 1');
                $stmtSub->execute([$user['user_id']]);
                $sub = $stmtSub->fetch(PDO::FETCH_ASSOC);
                $planSlug = $sub ? ($sub['plan_slug'] ?? 'discovery') : 'discovery';
                $limits = require __DIR__ . '/../../config/plan-limits.php';
                $nurseLimits = $limits['nurse'][$planSlug] ?? $limits['nurse']['discovery'];
                $maxPerMonth = $nurseLimits['max_appointments_per_month'] ?? 10;
                if ($maxPerMonth !== null) {
                    $monthStart = date('Y-m-01 00:00:00');
                    $monthEnd = date('Y-m-t 23:59:59');
                    $stmtCount = $dbCheck->prepare('
                        SELECT COUNT(*) FROM appointments
                        WHERE assigned_nurse_id = ?
                        AND scheduled_at >= ? AND scheduled_at <= ?
                        AND status NOT IN (\'canceled\', \'refused\')
                    ');
                    $stmtCount->execute([$user['user_id'], $monthStart, $monthEnd]);
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
            require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
            $roleMiddleware = new RoleMiddleware();
            $roleMiddleware->handle($user, ['super_admin']);
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
                        $teamStmt = $dbPerm->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
                        $teamStmt->execute([$user['user_id'], $user['user_id']]);
                        $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
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

            $appointmentModel->updateStatus(
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
            if ($redispatch) {
                require_once __DIR__ . '/../../lib/Logger.php';
                $logger = new Logger();
                $logger->log($user['user_id'], $user['role'], 'redispatch', 'appointment', $id, [
                    'action' => 'redispatch',
                    'reason' => 'professional_unavailable'
                ]);
            }
        }
        echo json_encode(['success' => true]);
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
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

