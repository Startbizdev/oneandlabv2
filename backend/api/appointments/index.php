<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/StaffPatientConsent.php';
require_once __DIR__ . '/../../lib/PendingOfferExpiry.php';
require_once __DIR__ . '/../../lib/DbSchemaCache.php';
require_once __DIR__ . '/../../lib/AppointmentOfferSnooze.php';

/** Logs verbeux : désactivés si APP_ENV=production (après chargement .env par config/database.php). */
function appointmentsVerboseLoggingEnabled(): bool
{
    $env = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '')));
    return $env !== 'production';
}

/** Journalise toujours les erreurs (prod incluse) — appointments-error.log */
function logAppointmentError(string $message, $data = null): void
{
    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/appointments-error.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= "\n" . print_r($data, true);
    }
    $logMessage .= "\n" . str_repeat('-', 80) . "\n";
    @file_put_contents($logFile, $logMessage, FILE_APPEND);
}

/** Allège le payload liste (form_data complet × centaines de RDV → OOM PHP-FPM 128M). */
function trimAppointmentPayloadForList(array $appointment): array
{
    if (!empty($appointment['form_data']) && is_array($appointment['form_data'])) {
        $fd = $appointment['form_data'];
        $keep = [
            'first_name', 'last_name', 'gender', 'beneficiary_gender', 'birth_date',
            'email', 'phone', 'address', 'address_label', 'address_complement', 'availability',
            'availability_start', 'availability_end', 'availability_type',
        ];
        $trimmed = [];
        foreach ($keep as $key) {
            if (array_key_exists($key, $fd)) {
                $trimmed[$key] = $fd[$key];
            }
        }
        $appointment['form_data'] = $trimmed;
    }
    foreach (array_keys($appointment) as $key) {
        if (is_string($key) && (str_ends_with($key, '_encrypted') || str_ends_with($key, '_dek'))) {
            unset($appointment[$key]);
        }
    }
    return $appointment;
}

// Fonction de logging
function logAppointment($message, $data = null) {
    if (!appointmentsVerboseLoggingEnabled()) {
        return;
    }
    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/appointments.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= "\n" . print_r($data, true);
    }
    $logMessage .= "\n" . str_repeat('-', 80) . "\n";
    @file_put_contents($logFile, $logMessage, FILE_APPEND);
}

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true'); // Autoriser l'envoi de cookies pour les sessions

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification requise pour GET (liste filtrée par rôle) et POST
$user = null;
try {
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    logAppointment('Authentification réussie', ['user_id' => $user['user_id'] ?? null, 'role' => $user['role'] ?? null]);
    
    // Vérifier CSRF pour les requêtes modifiantes
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        CSRFMiddleware::handle();
    }
} catch (Exception $e) {
    logAppointment('ERREUR lors de l\'authentification', ['error' => $e->getMessage()]);
    throw $e;
}

$appointmentModel = new Appointment();
$config = require __DIR__ . '/../../config/database.php';

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    @ini_set('memory_limit', '512M');

    logAppointment('=== DEBUT GET /appointments ===');
    
    // Liste des rendez-vous avec filtres
    $status = $_GET['status'] ?? null;
    $type = $_GET['type'] ?? null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    // Pagination mobile : 20 par page ; plafond 50 pour éviter les abus.
    $limit = min(max($limit, 1), 50);
    $offset = ($page - 1) * $limit;
    $patientPeriod = isset($_GET['patient_period']) ? trim((string) $_GET['patient_period']) : null;
    if ($patientPeriod !== null && !in_array($patientPeriod, ['upcoming', 'past'], true)) {
        $patientPeriod = null;
    }
    $dateFrom = !empty($_GET['date_from']) ? trim((string) $_GET['date_from']) : null;
    $dateTo = !empty($_GET['date_to']) ? trim((string) $_GET['date_to']) : null;
    
    logAppointment('Paramètres GET', [
        'status' => $status,
        'type' => $type,
        'page' => $page,
        'limit' => $limit,
        'offset' => $offset,
        'GET_array' => $_GET
    ]);
    
    $hasRelativeColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'relative_id');
    $hasPatientRelativesTable = DbSchemaCache::tableExists($db, 'patient_relatives');
    $useRelativeJoin = $hasRelativeColumn && $hasPatientRelativesTable;
    $hasMergedColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'merged_into_appointment_id');
    
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
            WHERE 1=1
        ';
    } else {
        // Si la colonne n'existe pas, ne pas faire le JOIN
        $sql = '
            SELECT
                a.*,
                cc.name as category_name,
                cc.type as category_type,
                cc.icon as category_icon,
                cc.image_url as category_image_url
            FROM appointments a
            LEFT JOIN care_categories cc ON a.category_id = cc.id
            WHERE 1=1
        ';
    }
    $params = [];
    if ($hasMergedColumn) {
        $sql .= ' AND a.merged_into_appointment_id IS NULL';
    }
    
    if ($status) {
        if (strpos($status, ',') !== false) {
            $statuses = explode(',', $status);
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $sql .= " AND a.status IN ($placeholders)";
            $params = array_merge($params, $statuses);
        } else {
            $sql .= ' AND a.status = ?';
            $params[] = $status;
        }
    }
    
    if ($type) {
        $sql .= ' AND a.type = ?';
        $params[] = $type;
    }
    if ($dateFrom) {
        $sql .= ' AND a.scheduled_at >= ?';
        $params[] = $dateFrom;
    }
    if ($dateTo) {
        $sql .= ' AND a.scheduled_at <= ?';
        $params[] = $dateTo;
    }

    $patientIdFilter = !empty($_GET['patient_id']) ? trim((string) $_GET['patient_id']) : null;
    if ($patientIdFilter !== null && $patientIdFilter !== '') {
        $sql .= ' AND a.patient_id = ?';
        $params[] = $patientIdFilter;
    }

    // Filtrer selon le rôle de l'utilisateur (super_admin peut passer user_id pour voir les RDV d'un user)
    if ($user) {
        $role = $user['role'];
        $userId = $user['user_id'];
        if ($user['role'] === 'super_admin' && !empty($_GET['user_id'])) {
            $requestedUserId = trim((string) $_GET['user_id']);
            $roleStmt = $db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
            $roleStmt->execute([$requestedUserId]);
            $targetProfile = $roleStmt->fetch(PDO::FETCH_ASSOC);
            if ($targetProfile && !empty($targetProfile['role'])) {
                $userId = $requestedUserId;
                $role = $targetProfile['role'];
                logAppointment('Super admin: RDV pour user_id', ['user_id' => $userId, 'role' => $role]);
            }
        }

        if ($role === 'patient') {
            if ($useRelativeJoin) {
                // JOIN pr déjà présent : évite EXISTS (casse le COUNT via preg_replace).
                $sql .= ' AND (a.patient_id = ? OR pr.patient_id = ?)';
                $params[] = $userId;
                $params[] = $userId;
            } else {
                $sql .= ' AND a.patient_id = ?';
                $params[] = $userId;
            }
            $terminalStatuses = ['completed', 'canceled', 'cancelled', 'refused', 'expired'];
            if ($patientPeriod === 'upcoming') {
                $terminalPh = implode(',', array_fill(0, count($terminalStatuses), '?'));
                $sql .= " AND a.status NOT IN ($terminalPh)";
                $params = array_merge($params, $terminalStatuses);
                $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
                $parisStart->setTimezone(new DateTimeZone('UTC'));
                $sql .= ' AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?)';
                $params[] = $parisStart->format('Y-m-d H:i:s');
            } elseif ($patientPeriod === 'past') {
                $terminalPh = implode(',', array_fill(0, count($terminalStatuses), '?'));
                $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
                $parisStart->setTimezone(new DateTimeZone('UTC'));
                $sql .= " AND (a.status IN ($terminalPh) OR (a.scheduled_at IS NOT NULL AND a.scheduled_at < ?))";
                $params = array_merge($params, $terminalStatuses);
                $params[] = $parisStart->format('Y-m-d H:i:s');
            }
        } elseif ($role === 'nurse') {
            $nurseTab = isset($_GET['nurse_tab']) ? trim((string) $_GET['nurse_tab']) : '';
            $nurseSegment = isset($_GET['nurse_segment']) ? trim((string) $_GET['nurse_segment']) : '';
            // Alias anciennes URL
            if ($nurseSegment === 'dispatches') {
                $nurseSegment = 'tous';
            }
            if ($nurseSegment === 'offres') {
                $nurseSegment = 'en_attente';
            }
            if ($nurseSegment === 'tour') {
                $nurseSegment = 'acceptes';
            }
            if ($nurseTab === 'demandes') {
                $nurseSegment = 'envoyes';
            }
            logAppointment('Filtrage pour infirmier', ['user_id' => $userId, 'status' => $status, 'nurse_tab' => $nurseTab, 'nurse_segment' => $nurseSegment]);

            if ($nurseSegment === 'envoyes') {
                $sql .= " AND a.type = 'blood_test' AND a.created_by = ?";
                $params[] = $userId;
            } elseif ($nurseSegment === 'en_attente') {
                $sql .= " AND a.type = 'nursing' AND a.status = 'pending'
                    AND a.assigned_nurse_id IS NULL
                    AND " . PendingOfferExpiry::sqlCreatedWithinTtl('a') . "
                    AND EXISTS (SELECT 1 FROM appointment_offers o2 WHERE o2.appointment_id = a.id AND o2.profile_id = ?)";
                $params[] = $userId;
            } elseif ($nurseSegment === 'acceptes') {
                $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
                $parisStart->setTimezone(new DateTimeZone('UTC'));
                $sql .= " AND a.type = 'nursing' AND a.assigned_nurse_id = ? AND a.status IN ('confirmed','inProgress','planned')
                    AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?)";
                $params[] = $userId;
                $params[] = $parisStart->format('Y-m-d H:i:s');
            } elseif ($nurseSegment === 'historique') {
                $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
                $parisStart->setTimezone(new DateTimeZone('UTC'));
                $sql .= " AND a.type = 'nursing' AND a.assigned_nurse_id = ? AND (
                    a.status IN ('completed','canceled','cancelled','refused')
                    OR (a.scheduled_at IS NOT NULL AND a.scheduled_at < ?)
                )";
                $params[] = $userId;
                $params[] = $parisStart->format('Y-m-d H:i:s');
            } elseif ($nurseSegment === 'relais') {
                // Relais : créés par l’infirmier, encore à prendre par un confrère — pas ceux qu’il a lui-même redispatchés
                $sql .= " AND a.type = 'nursing' AND a.created_by = ? AND a.status = 'pending' AND (a.assigned_nurse_id IS NULL OR a.assigned_nurse_id <> ?)
                    AND NOT EXISTS (
                        SELECT 1 FROM appointment_status_updates u
                        WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
                    )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = '%redispatch%';
            } elseif ($nurseTab === 'soins' && ($nurseSegment === '' || $nurseSegment === 'tous')) {
                // Mes rendez-vous : assignés à moi + mes créations/relais — pas les offres zone (segment en_attente / page Mes demandes)
                $sql .= " AND (
                    (a.type = 'nursing' AND (
                        a.assigned_nurse_id = ?
                        OR (
                            a.created_by = ?
                            AND (a.assigned_nurse_id IS NULL OR a.assigned_nurse_id = ?)
                            AND NOT (
                                a.status = 'pending'
                                AND a.assigned_nurse_id IS NULL
                                AND EXISTS (
                                    SELECT 1 FROM appointment_status_updates u
                                    WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
                                )
                            )
                        )
                    ))
                    OR (a.type = 'blood_test' AND a.created_by = ?)
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = '%redispatch%';
                $params[] = $userId;
            } else {
                // Défaut (aucun nurse_tab) : idem « Mes soins » / tous — sans offres entrantes zone
                $sql .= " AND (
                    (a.type = 'nursing' AND (
                        a.assigned_nurse_id = ?
                        OR (
                            a.created_by = ?
                            AND (a.assigned_nurse_id IS NULL OR a.assigned_nurse_id = ?)
                            AND NOT (
                                a.status = 'pending'
                                AND a.assigned_nurse_id IS NULL
                                AND EXISTS (
                                    SELECT 1 FROM appointment_status_updates u
                                    WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
                                )
                            )
                        )
                    ))
                    OR (a.type = 'blood_test' AND a.created_by = ?)
                )";
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = $userId;
                $params[] = '%redispatch%';
                $params[] = $userId;
            }

            // Infirmier : n’afficher aucun RDV où cet utilisateur a redispatché (hors vue « Dispatches », supprimée)
            $sql .= " AND NOT EXISTS (
                SELECT 1 FROM appointment_status_updates u
                WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
            )";
            $params[] = $userId;
            $params[] = '%redispatch%';

            // Filtrer selon les préférences de catégories (sauf prises de sang « envoyées » = uniquement blood_test)
            // « Mes demandes » (en_attente) : ne pas filtrer par catégorie — sinon une offre reçue (lien partage / zone) peut être invisible.
            if ($nurseSegment !== 'envoyes' && $nurseSegment !== 'en_attente') {
                $prefsCheckSql = 'SELECT COUNT(*) as count FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = TRUE';
                $prefsStmt = $db->prepare($prefsCheckSql);
                $prefsStmt->execute([$userId]);
                $prefsCount = $prefsStmt->fetch(PDO::FETCH_ASSOC)['count'];

                if ($prefsCount > 0) {
                    // Toujours montrer les soins créés par l’infirmier (lot bilan+pansement, etc.) même si la catégorie
                    // n’est pas cochée dans les préférences ou si assigned_nurse_id n’est pas encore posé en base.
                    $sql .= ' AND (
                        a.type = \'blood_test\' OR
                        a.category_id IS NULL OR
                        a.category_id IN (
                            SELECT category_id
                            FROM nurse_category_preferences
                            WHERE nurse_id = ? AND is_enabled = TRUE
                        )
                        OR (a.type = \'nursing\' AND a.assigned_nurse_id = ?)
                        OR (a.type = \'nursing\' AND a.created_by = ? AND a.created_by_role = \'nurse\')
                    )';
                    $params[] = $userId;
                    $params[] = $userId;
                    $params[] = $userId;
                    logAppointment('Filtrage par préférences de catégories', ['prefs_count' => $prefsCount]);
                } else {
                    logAppointment('Aucune préférence de catégorie, tous les rendez-vous acceptés');
                }
            }
        } elseif ($role === 'lab' || $role === 'subaccount') {
            // Lab / sous-compte : même périmètre d'équipe (le sous-compte voit les RDV assignés au lab parent)
            $teamIds = LabTeamAccess::teamMemberIds($db, $userId, $role);
            if (empty($teamIds)) {
                $teamIds = [$userId];
            }
            $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
            $sql .= " AND a.type = 'blood_test' AND (a.assigned_lab_id IN ($placeholders) OR (a.assigned_lab_id IS NULL AND a.status = 'pending' AND EXISTS (SELECT 1 FROM appointment_offers o WHERE o.appointment_id = a.id AND o.profile_id IN ($placeholders))))";
            $params = array_merge($params, $teamIds, $teamIds);

            $fl = !empty($_GET['filter_assigned_lab_id']) ? trim((string) $_GET['filter_assigned_lab_id']) : '';
            if ($fl !== '' && in_array($fl, $teamIds, true)) {
                $sql .= ' AND a.assigned_lab_id = ?';
                $params[] = $fl;
            }
            $fa = !empty($_GET['filter_assigned_to']) ? trim((string) $_GET['filter_assigned_to']) : '';
            if ($fa !== '') {
                $chkPrel = $db->prepare("SELECT 1 FROM profiles WHERE id = ? AND lab_id IN ($placeholders) AND role = 'preleveur' LIMIT 1");
                $chkPrel->execute(array_merge([$fa], $teamIds));
                if ($chkPrel->fetchColumn()) {
                    $sql .= ' AND a.assigned_to = ?';
                    $params[] = $fa;
                }
            }

            $labIdForPrefs = $userId;
            if ($role === 'subaccount') {
                $subLabStmt = $db->prepare('SELECT lab_id FROM profiles WHERE id = ? LIMIT 1');
                $subLabStmt->execute([$userId]);
                $subLabRow = $subLabStmt->fetch(PDO::FETCH_ASSOC);
                if ($subLabRow && !empty($subLabRow['lab_id'])) {
                    $labIdForPrefs = (string) $subLabRow['lab_id'];
                }
            }

            $labCatTable = $db->query("SHOW TABLES LIKE 'lab_category_preferences'");
            if ($labCatTable && $labCatTable->rowCount() > 0) {
                $labCatStmt = $db->prepare('SELECT COUNT(*) FROM lab_category_preferences WHERE lab_id = ? AND is_enabled = TRUE');
                $labCatStmt->execute([$labIdForPrefs]);
                $labCatCount = (int) $labCatStmt->fetchColumn();
                if ($labCatCount > 0) {
                    $sql .= ' AND (
                        a.category_id IS NULL OR
                        a.category_id IN (
                            SELECT category_id FROM lab_category_preferences
                            WHERE lab_id = ? AND is_enabled = TRUE
                        )
                        OR a.assigned_lab_id IS NOT NULL
                    )';
                    $params[] = $labIdForPrefs;
                }
            }
        } elseif ($role === 'preleveur') {
            $assignedOnly = !empty($_GET['assigned_only'])
                && in_array(strtolower(trim((string) $_GET['assigned_only'])), ['1', 'true', 'yes'], true);
            if ($assignedOnly) {
                $sql .= ' AND a.assigned_to = ? AND a.type = \'blood_test\'';
                $params[] = $userId;
            } else {
                $prelLabStmt = $db->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
                $prelLabStmt->execute([$userId]);
                $prelLabId = (string) ($prelLabStmt->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
                if ($prelLabId !== '') {
                    $sql .= ' AND a.type = "blood_test" AND (
                        a.assigned_to = ?
                        OR (
                            a.status = "pending"
                            AND (a.assigned_to IS NULL OR a.assigned_to = "")
                            AND a.assigned_lab_id = ?
                        )
                        OR (
                            a.status = "pending"
                            AND EXISTS (
                                SELECT 1 FROM appointment_offers o
                                WHERE o.appointment_id = a.id AND o.profile_id = ?
                            )
                        )
                    )';
                    $params[] = $userId;
                    $params[] = $prelLabId;
                    $params[] = $userId;
                } else {
                    $sql .= ' AND a.assigned_to = ? AND a.type = "blood_test"';
                    $params[] = $userId;
                }
            }
        } elseif ($role === 'pro') {
            $sql .= ' AND (a.created_by = ? OR a.assigned_pro_id = ?)';
            $params[] = $userId;
            $params[] = $userId;
        }
        // super_admin sans user_id voit tout (pas de filtre supplémentaire)

        if (
            $status === 'pending'
            && in_array($role, ['nurse', 'lab', 'subaccount', 'preleveur'], true)
        ) {
            $sql .= ' AND ' . PendingOfferExpiry::sqlCreatedWithinTtl('a');
        }
    }

    $view = isset($_GET['view']) ? trim((string) $_GET['view']) : '';
    $skipCount = !empty($_GET['skip_count'])
        && in_array(strtolower(trim((string) $_GET['skip_count'])), ['1', 'true', 'yes'], true);

    if ($view === 'cards') {
        require_once __DIR__ . '/../../lib/AppointmentListCards.php';
        require_once __DIR__ . '/../../lib/AppointmentListPayload.php';

        $cardLimit = min(max($limit, 1), 48);
        $cardPage = max(1, $page);

        try {
            $cardMeta = AppointmentListCards::paginateCardKeys(
                $db,
                $sql,
                $params,
                $cardPage,
                $cardLimit,
                $skipCount
            );
        } catch (Throwable $e) {
            logAppointmentError('pagination cartes RDV', ['error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur pagination cartes']);
            exit;
        }

        $fetchParams = $params;
        $repIdRows = AppointmentListCards::fetchRepresentativeIdRows(
            $db,
            $sql,
            $cardMeta['keys'],
            $fetchParams
        );
        $representativeIds = array_values(array_filter(array_map(
            static fn(array $row): string => (string) ($row['id'] ?? ''),
            $repIdRows
        )));

        if ($representativeIds === []) {
            echo json_encode([
                'success' => true,
                'data' => ['rows' => []],
                'pagination' => [
                    'page' => $cardPage,
                    'limit' => $cardLimit,
                    'total_cards' => $cardMeta['total_cards'],
                    'has_more' => $cardMeta['has_more'],
                ],
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $repPlaceholders = implode(',', array_fill(0, count($representativeIds), '?'));
        $fetchSql = $sql . " AND a.id IN ($repPlaceholders)";
        $fetchParams = array_merge($fetchParams, $representativeIds);
        $fetchSql .= ' ORDER BY a.created_at DESC, a.scheduled_at DESC';

        $fetchStmt = $db->prepare($fetchSql);
        $fetchStmt->execute($fetchParams);
        $appointments = $fetchStmt->fetchAll(PDO::FETCH_ASSOC);

        if ($user) {
            $decrypted = AppointmentListPayload::decryptRowsForList(
                $appointmentModel,
                $appointments,
                $user['user_id'],
                $user['role']
            );
            $decrypted = AppointmentListPayload::enrichForListCards(
                $db,
                $appointmentModel,
                $decrypted,
                $hasMergedColumn
            );
            $appointmentModel->enrichListAssigneeReviewStats($decrypted);
            $rows = AppointmentListCards::groupIntoRows($decrypted, $cardMeta['keys']);
        } else {
            $rows = [];
        }

        $totalCards = $cardMeta['total_cards'];
        if ($skipCount && $totalCards === 0) {
            $totalCards = ($cardPage - 1) * $cardLimit + count($rows);
            if ($cardMeta['has_more']) {
                $totalCards = max($totalCards, $cardPage * $cardLimit + 1);
            }
        }

        logAppointment('=== FIN GET /appointments view=cards ===', [
            'page' => $cardPage,
            'limit' => $cardLimit,
            'rows' => count($rows),
            'appointments_fetched' => count($appointments),
            'representatives_fetched' => count($representativeIds),
            'has_more' => $cardMeta['has_more'],
        ]);

        echo json_encode([
            'success' => true,
            'data' => [
                'rows' => $rows,
            ],
            'pagination' => [
                'page' => $cardPage,
                'limit' => $cardLimit,
                'total_cards' => $totalCards,
                'has_more' => $cardMeta['has_more'],
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Compter le total - construire la requête COUNT à partir de la requête principale
    logAppointment('Construction de la requête COUNT');
    logAppointment('SQL avant COUNT', ['sql' => $sql, 'params' => $params]);
    
    // Utiliser une approche plus simple : remplacer SELECT ... FROM par SELECT COUNT(*)
    $countSql = $sql;
    if ($useRelativeJoin) {
        // Limite à 1 remplacement : ne pas toucher aux SELECT … FROM des sous-requêtes EXISTS.
        $countSql = preg_replace(
            '/SELECT[\s\S]*?FROM/i',
            'SELECT COUNT(DISTINCT a.id) as total FROM',
            $countSql,
            1
        );
    } else {
        $countSql = preg_replace(
            '/SELECT[\s\S]*?FROM/i',
            'SELECT COUNT(*) as total FROM',
            $countSql,
            1
        );
    }
    // Retirer ORDER BY et LIMIT si présents
    $countSql = preg_replace('/\s+ORDER BY[\s\S]*$/i', '', $countSql);
    $countSql = preg_replace('/\s+LIMIT[\s\S]*$/i', '', $countSql);
    
    logAppointment('Requête COUNT construite', ['countSql' => $countSql]);
    
    $total = 0;
    if (!$skipCount) {
    try {
        logAppointment('Exécution de la requête COUNT');
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $countResult = $countStmt->fetch();
        $total = $countResult ? (int)$countResult['total'] : 0;
        logAppointment('Requête COUNT réussie', ['total' => $total]);
    } catch (PDOException $e) {
        // En cas d'erreur, logger et utiliser 0 comme valeur par défaut
        logAppointment('ERREUR lors du comptage des rendez-vous', [
            'error' => $e->getMessage(),
            'code' => $e->getCode(),
            'countSql' => $countSql,
            'params' => $params
        ]);
        $total = 0;
    }
    }
    
    // Récupérer les résultats avec pagination
    // Utiliser des valeurs entières directement dans la requête pour LIMIT et OFFSET
    // car certains drivers PDO ne supportent pas les placeholders pour LIMIT/OFFSET
    // Infirmier : trier par date de création d’abord — un lot bilan + soin a souvent des scheduled_at différents,
    // avec ORDER BY scheduled_at seul le soin peut se retrouver loin (ou sur une autre page) alors qu’il vient d’être créé.
    // Admin (super_admin) : derniers RDV créés en premier (created_at), pas seulement la date de soin la plus lointaine.
    $sort = isset($_GET['sort']) ? trim((string) $_GET['sort']) : '';
    $orderBy = ' ORDER BY a.scheduled_at DESC';
    if ($user && ($user['role'] ?? '') === 'nurse') {
        $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
    } elseif ($user && ($user['role'] ?? '') === 'super_admin') {
        $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
    } elseif ($sort === 'created_at') {
        $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
    } elseif ($user && ($user['role'] ?? '') === 'patient') {
        $orderBy = ($patientPeriod === 'past')
            ? ' ORDER BY a.scheduled_at DESC'
            : ' ORDER BY a.scheduled_at ASC';
    } elseif ($user && ($user['role'] ?? '') === 'preleveur') {
        $assignedOnlyOrder = !empty($_GET['assigned_only'])
            && in_array(strtolower(trim((string) $_GET['assigned_only'])), ['1', 'true', 'yes'], true);
        if ($assignedOnlyOrder) {
            $orderBy = ' ORDER BY a.scheduled_at ASC';
        } else {
            $orderBy = ' ORDER BY (CASE WHEN a.assigned_to = ? THEN 0 ELSE 1 END) ASC, a.scheduled_at DESC';
            $params[] = $userId;
        }
    }
    $sql .= $orderBy . ' LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    
    logAppointment('Exécution de la requête principale', ['sql' => $sql, 'params' => $params]);
    
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll();
        logAppointment('Requête principale réussie', [
            'count' => count($appointments),
            'user_role' => $user['role'] ?? null,
            'status_filter' => $status
        ]);
        
        // Log détaillé pour les infirmiers
        if ($user && $user['role'] === 'nurse') {
            $pendingCount = 0;
            $assignedCount = 0;
            $inZoneCount = 0;
            foreach ($appointments as $apt) {
                if ($apt['status'] === 'pending') {
                    $pendingCount++;
                    if (empty($apt['assigned_nurse_id'])) {
                        $inZoneCount++;
                    } else {
                        $assignedCount++;
                    }
                }
            }
            logAppointment('Détails rendez-vous infirmier', [
                'total' => count($appointments),
                'pending' => $pendingCount,
                'pending_assigned' => $assignedCount,
                'pending_in_zone' => $inZoneCount,
                'appointment_ids' => array_column($appointments, 'id')
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        $errorMessage = $e->getMessage();
        $errorCode = $e->getCode();
        
        logAppointment('ERREUR FATALE lors de la récupération des rendez-vous', [
            'error' => $errorMessage,
            'code' => $errorCode,
            'sql' => $sql,
            'params' => $params,
            'trace' => $e->getTraceAsString()
        ]);
        logAppointmentError('PDO liste RDV', [
            'error' => $errorMessage,
            'role' => $user['role'] ?? null,
            'limit' => $limit,
            'page' => $page,
        ]);
        
        // Retourner plus de détails en mode développement
        $response = [
            'success' => false,
            'error' => 'Erreur lors de la récupération des rendez-vous: ' . $errorMessage,
            'code' => 'DATABASE_ERROR',
        ];
        
        // En développement ou localhost, inclure plus de détails
        $isDevelopment = (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development') 
                      || (isset($_SERVER['HTTP_HOST']) && strpos($_SERVER['HTTP_HOST'], 'localhost') !== false);
        
        if ($isDevelopment) {
            $response['debug'] = [
                'message' => $errorMessage,
                'code' => $errorCode,
                'sql' => $sql,
                'params_count' => count($params),
                'params' => $params,
            ];
        }
        
        echo json_encode($response);
        exit;
    }
    
    // Déchiffrer les données (éviter N+1 : decryptRowForList au lieu de getById)
    $decryptedAppointments = [];
    if ($user) {
        foreach ($appointments as $appointment) {
            try {
                $decrypted = $appointmentModel->decryptRowForList($appointment, $user['user_id'], $user['role']);
                $decryptedAppointments[] = trimAppointmentPayloadForList($decrypted);
            } catch (Exception $e) {
                error_log('Erreur déchiffrement RDV ' . $appointment['id'] . ': ' . $e->getMessage());
                $decryptedAppointments[] = [
                    'id' => $appointment['id'],
                    'type' => $appointment['type'],
                    'status' => $appointment['status'],
                    'scheduled_at' => $appointment['scheduled_at'],
                    'address' => null,
                    'form_data' => [],
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }
        // Batch lookup noms + photos (assignés + patient bénéficiaire pour cartes liste)
        $userIds = [];
        foreach ($decryptedAppointments as $apt) {
            if (!empty($apt['assigned_lab_id'])) $userIds[] = $apt['assigned_lab_id'];
            if (!empty($apt['assigned_nurse_id'])) $userIds[] = $apt['assigned_nurse_id'];
            if (!empty($apt['assigned_to'])) $userIds[] = $apt['assigned_to'];
            if (!empty($apt['patient_id'])) $userIds[] = $apt['patient_id'];
        }
        if (!empty($userIds)) {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $displayNames = $userModel->getDisplayNamesByIds($userIds);
            $profileImages = $userModel->getProfileImageUrlsByIds($userIds);
            $genders = $userModel->getGendersByIds($userIds);
            foreach ($decryptedAppointments as &$apt) {
                $labId = $apt['assigned_lab_id'] ?? '';
                $nurseId = $apt['assigned_nurse_id'] ?? '';
                $toId = $apt['assigned_to'] ?? '';
                $patientId = $apt['patient_id'] ?? '';
                $apt['assigned_lab_display_name'] = $displayNames[$labId] ?? null;
                $apt['assigned_nurse_display_name'] = $displayNames[$nurseId] ?? null;
                $apt['assigned_to_display_name'] = $displayNames[$toId] ?? null;
                $apt['assigned_lab_profile_image_url'] = $profileImages[$labId] ?? null;
                $apt['assigned_nurse_profile_image_url'] = $profileImages[$nurseId] ?? null;
                $apt['assigned_to_profile_image_url'] = $profileImages[$toId] ?? null;
                $apt['beneficiary_profile_image_url'] = $profileImages[$patientId] ?? null;
                $apt['assigned_lab_gender'] = $genders[$labId] ?? null;
                $apt['assigned_nurse_gender'] = $genders[$nurseId] ?? null;
                $apt['assigned_to_gender'] = $genders[$toId] ?? null;
                $fdGender = null;
                if (!empty($apt['form_data']) && is_array($apt['form_data'])) {
                    $fg = $apt['form_data']['gender'] ?? $apt['form_data']['beneficiary_gender'] ?? null;
                    if (is_string($fg) && trim($fg) !== '') {
                        $fdGender = strtolower(trim($fg));
                    }
                }
                $apt['beneficiary_gender'] = $fdGender ?: ($genders[$patientId] ?? null);
            }
            unset($apt);
        }
        $appointmentModel->enrichListAssigneeReviewStats($decryptedAppointments);
        $listRole = (string) ($user['role'] ?? '');
        if (in_array($listRole, ['nurse', 'lab', 'subaccount', 'preleveur'], true)) {
            AppointmentOfferSnooze::enrichListWithSnooze($db, $decryptedAppointments, $userId);
        }

        $bloodTestIds = array_values(array_filter(array_map(
            static fn($apt) => (($apt['type'] ?? '') === 'blood_test') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if (!empty($bloodTestIds)) {
            $itemsByAppointment = $appointmentModel->loadBloodTestItemsForAppointments($bloodTestIds);
            $bloodBatchMergedFilter = '';
            if ($hasMergedColumn) {
                $bloodBatchMergedFilter = ' AND merged_into_appointment_id IS NULL';
            }
            $bloodBatchIdsCache = [];
            $bloodBatchStmt = $db->prepare('
                SELECT id FROM appointments
                WHERE creation_batch_id = ?
                  AND patient_id = ?
                  AND type = \'blood_test\'
                  ' . $bloodBatchMergedFilter . '
                ORDER BY scheduled_at ASC, created_at ASC, id ASC
            ');
            foreach ($decryptedAppointments as &$apt) {
                if (($apt['type'] ?? '') === 'blood_test') {
                    $tid = (string) ($apt['id'] ?? '');
                    $pre = $tid !== '' ? ($itemsByAppointment[$tid] ?? []) : [];
                    $apt['blood_test_items'] = $appointmentModel->resolveBloodTestItemsForAppointment($apt, $pre);
                    $bid = $apt['creation_batch_id'] ?? null;
                    $apt['blood_test_items_display'] = $apt['blood_test_items'];
                    if (!empty($bid) && !empty($apt['patient_id'])) {
                        try {
                            $batchKey = (string) $bid . '|' . (string) $apt['patient_id'];
                            if (!array_key_exists($batchKey, $bloodBatchIdsCache)) {
                                $bloodBatchStmt->execute([(string) $bid, (string) $apt['patient_id']]);
                                $bloodBatchIdsCache[$batchKey] = array_column(
                                    $bloodBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                                    'id'
                                );
                            }
                            $batchIds = $bloodBatchIdsCache[$batchKey];
                            if (count($batchIds) > 1) {
                                $mergedDisp = $appointmentModel->mergeBloodTestItemsAcrossBatchAppointmentIds($batchIds);
                                if (!empty($mergedDisp)) {
                                    $apt['blood_test_items_display'] = $mergedDisp;
                                }
                            }
                        } catch (Throwable $e) {
                            error_log('liste RDV blood_test_items_display batch: ' . $e->getMessage());
                        }
                    }
                }
            }
            unset($apt);
        }
        $nursingIds = array_values(array_filter(array_map(
            static fn($apt) => (($apt['type'] ?? '') === 'nursing') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if (!empty($nursingIds)) {
            $nursingByAppointment = $appointmentModel->loadNursingItemsForAppointments($nursingIds);
            $nursingBatchMergedFilter = '';
            if ($hasMergedColumn) {
                $nursingBatchMergedFilter = ' AND merged_into_appointment_id IS NULL';
            }
            $nursingBatchIdsCache = [];
            $nursingBatchStmt = $db->prepare('
                SELECT id FROM appointments
                WHERE creation_batch_id = ?
                  AND patient_id = ?
                  AND type = \'nursing\'
                  ' . $nursingBatchMergedFilter . '
                ORDER BY scheduled_at ASC, created_at ASC, id ASC
            ');
            foreach ($decryptedAppointments as &$apt) {
                if (($apt['type'] ?? '') === 'nursing') {
                    $tid = (string) ($apt['id'] ?? '');
                    $pre = $tid !== '' ? ($nursingByAppointment[$tid] ?? []) : [];
                    $apt['nursing_items'] = $appointmentModel->resolveNursingItemsForAppointment($apt, $pre);
                    $bid = $apt['creation_batch_id'] ?? null;
                    $apt['nursing_items_display'] = $apt['nursing_items'];
                    if (!empty($bid) && !empty($apt['patient_id'])) {
                        try {
                            $batchKey = (string) $bid . '|' . (string) $apt['patient_id'];
                            if (!array_key_exists($batchKey, $nursingBatchIdsCache)) {
                                $nursingBatchStmt->execute([(string) $bid, (string) $apt['patient_id']]);
                                $nursingBatchIdsCache[$batchKey] = array_column(
                                    $nursingBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                                    'id'
                                );
                            }
                            $batchIds = $nursingBatchIdsCache[$batchKey];
                            if (count($batchIds) > 1) {
                                $mergedDisp = $appointmentModel->mergeNursingItemsAcrossBatchAppointmentIds($batchIds);
                                if (!empty($mergedDisp)) {
                                    $apt['nursing_items_display'] = $mergedDisp;
                                }
                            }
                        } catch (Throwable $e) {
                            error_log('liste RDV nursing_items_display batch: ' . $e->getMessage());
                        }
                    }
                }
            }
            unset($apt);
        }
    } else {
        foreach ($appointments as $appointment) {
            $decryptedAppointments[] = [
                'id' => $appointment['id'],
                'type' => $appointment['type'],
                'status' => $appointment['status'],
                'scheduled_at' => $appointment['scheduled_at'],
            ];
        }
    }
    
    $returnedCount = count($decryptedAppointments);
    // COUNT SQL incohérent (total=0 alors qu’il y a des lignes) : borne minimale pour l’UI.
    $countIncoherent = ($total === 0 && $returnedCount > 0);
    if ($countIncoherent) {
        $total = ($page - 1) * $limit + $returnedCount;
    }
    $hasMore = false;
    if ($limit > 0 && $returnedCount >= $limit) {
        if ($countIncoherent) {
            // Page pleine alors que le comptage global était à 0 : il peut exister d’autres pages.
            $hasMore = true;
        } else {
            $hasMore = ((($page - 1) * $limit + $returnedCount) < $total);
        }
    }

    logAppointment('=== FIN GET /appointments - SUCCES ===', [
        'total' => $total,
        'returned' => $returnedCount,
        'has_more' => $hasMore,
    ]);
    
    $pages = $limit > 0 ? (int) ceil($total / $limit) : 0;
    $payload = [
        'success' => true,
        'data' => $decryptedAppointments,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => $pages,
            'has_more' => $hasMore,
        ],
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        logAppointmentError('json_encode liste RDV échoué', [
            'error' => json_last_error_msg(),
            'returned' => $returnedCount,
            'role' => $user['role'] ?? null,
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1048576, 1),
        ]);
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Réponse trop volumineuse. Réessayez avec une pagination plus petite.',
            'code' => 'PAYLOAD_TOO_LARGE',
        ]);
        exit;
    }
    echo $json;
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Création d'un rendez-vous — préleveur : uniquement reprise RDV prise de sang (blood_test + RDV source)
    $allowedCreateRoles = ['patient', 'pro', 'nurse', 'lab', 'subaccount', 'super_admin', 'preleveur'];
    if (!in_array($user['role'], $allowedCreateRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Création de rendez-vous non autorisée pour ce rôle',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }

    // Création d'un rendez-vous
    $rawInput = file_get_contents('php://input');
    logAppointment('=== DEBUT POST /appointments ===', ['raw_input_length' => strlen($rawInput)]);
    $input = json_decode($rawInput, true);
    
    // Vérifier que les données sont valides
    if (!is_array($input) || empty($input)) {
        logAppointment('ERREUR: Données invalides ou manquantes', ['json_error' => json_last_error_msg(), 'input_preview' => substr($rawInput, 0, 200)]);
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Données invalides ou manquantes',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }
    
    logAppointment('Données reçues', [
        'has_type' => isset($input['type']),
        'has_form_type' => isset($input['form_type']),
        'has_address' => isset($input['address']),
        'has_scheduled_at' => isset($input['scheduled_at']),
        'has_patient_id' => isset($input['patient_id']),
        'has_form_data' => isset($input['form_data']),
        'keys' => array_keys($input)
    ]);
    
    // Remonter category_id en racine si envoyé uniquement dans form_data (ex: formulaire pro)
    if (empty($input['category_id']) && !empty($input['form_data']['category_id'])) {
        $input['category_id'] = $input['form_data']['category_id'];
    }

    StaffPatientConsent::validateOrFail($input, $user);

    if ($user['role'] === 'preleveur') {
        $t = isset($input['type']) ? (string) $input['type'] : '';
        $ft = isset($input['form_type']) ? (string) $input['form_type'] : '';
        if ($t !== 'blood_test' || $ft !== 'blood_test') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Les préleveurs ne peuvent créer que des rendez-vous de prise de sang.',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        $fromId = isset($input['reschedule_from_appointment_id']) ? trim((string) $input['reschedule_from_appointment_id']) : '';
        if ($fromId === '' || !Validation::uuid($fromId)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Identifiant du rendez-vous source requis pour cette action.',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }
        $configPrel = require __DIR__ . '/../../config/database.php';
        $dsnPrel = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $configPrel['host'],
            $configPrel['port'],
            $configPrel['database'],
            $configPrel['charset']
        );
        $dbPrel = new PDO($dsnPrel, $configPrel['username'], $configPrel['password'], $configPrel['options'] ?? []);
        $stmtSrc = $dbPrel->prepare('SELECT type, assigned_lab_id, assigned_to, patient_id FROM appointments WHERE id = ? LIMIT 1');
        $stmtSrc->execute([$fromId]);
        $srcApt = $stmtSrc->fetch(PDO::FETCH_ASSOC);
        if (!$srcApt || ($srcApt['type'] ?? '') !== 'blood_test') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Rendez-vous source introuvable ou non autorisé.',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        $stmtPrelLab = $dbPrel->prepare('SELECT lab_id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
        $stmtPrelLab->execute([$user['user_id'], 'preleveur']);
        $prelProfile = $stmtPrelLab->fetch(PDO::FETCH_ASSOC);
        $prelLabId = $prelProfile['lab_id'] ?? null;
        $uidPrel = (string) $user['user_id'];
        $assignedToSrc = isset($srcApt['assigned_to']) && $srcApt['assigned_to'] !== null && $srcApt['assigned_to'] !== ''
            ? (string) $srcApt['assigned_to'] : '';
        $assignedLabSrc = isset($srcApt['assigned_lab_id']) && $srcApt['assigned_lab_id'] !== null && $srcApt['assigned_lab_id'] !== ''
            ? (string) $srcApt['assigned_lab_id'] : '';
        $allowedPrel = ($assignedToSrc !== '' && $assignedToSrc === $uidPrel)
            || ($prelLabId !== null && $prelLabId !== '' && $assignedLabSrc !== '' && $assignedLabSrc === (string) $prelLabId);
        if (!$allowedPrel) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Vous ne pouvez reprendre ce rendez-vous que pour un patient dont le RDV vous est attribué ou appartient à votre laboratoire.',
                'code' => 'FORBIDDEN',
            ]);
            exit;
        }
        // Sécurité serveur : une reprise créée par un préleveur doit rester rattachée
        // au préleveur et à son labo/sous-labo, même si le frontend n'envoie pas lab_id.
        $effectiveAssignedLabId = $prelLabId ?: $assignedLabSrc;
        if ($effectiveAssignedLabId === '') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Aucun laboratoire associé au préleveur pour rattacher le nouveau rendez-vous.',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }
        $input['assigned_to'] = $uidPrel;
        $input['assigned_lab_id'] = $effectiveAssignedLabId;
        $input['status'] = 'confirmed';

        $patientSrc = isset($srcApt['patient_id']) ? (string) $srcApt['patient_id'] : '';
        $patientBody = isset($input['patient_id']) ? (string) $input['patient_id'] : '';
        if ($patientSrc !== '' && $patientBody !== '' && $patientSrc !== $patientBody) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le patient ne correspond pas au rendez-vous repris.',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }
    }

    $inputForCreate = $input;
    unset($inputForCreate['reschedule_from_appointment_id']);

    $externalNurseInvite = null;
    if (!empty($inputForCreate['external_nurse_invite']) && is_array($inputForCreate['external_nurse_invite'])) {
        $externalNurseInvite = $inputForCreate['external_nurse_invite'];
        unset($inputForCreate['external_nurse_invite']);
    }
    if (!empty($inputForCreate['skip_zone_dispatch'])) {
        $inputForCreate['skip_zone_dispatch'] = true;
    }

    if (!empty($inputForCreate['utm_qr']) && empty($inputForCreate['attribution_qr_id'])) {
        require_once __DIR__ . '/../../lib/QrCodeService.php';
        $qrResolve = new QrCodeService();
        $resolvedQrId = $qrResolve->resolveAttributionQrId((string) $inputForCreate['utm_qr']);
        if ($resolvedQrId !== null) {
            $inputForCreate['attribution_qr_id'] = $resolvedQrId;
        }
    }

    if (!empty($inputForCreate['assigned_pro_id']) && !Validation::uuid((string) $inputForCreate['assigned_pro_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'assigned_pro_id invalide',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }

    if (!empty($inputForCreate['attribution_qr_id']) && !Validation::uuid((string) $inputForCreate['attribution_qr_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'attribution_qr_id invalide',
            'code' => 'VALIDATION_ERROR',
        ]);
        exit;
    }

    if (($inputForCreate['type'] ?? '') === 'nursing') {
        $ni = $inputForCreate['nursing_items'] ?? ($inputForCreate['form_data']['nursing_items'] ?? null);
        if ($ni !== null && !is_array($ni)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le champ nursing_items doit être un tableau lorsqu’il est fourni.',
                'code' => 'VALIDATION_ERROR',
            ]);
            exit;
        }
        if (is_array($ni)) {
            foreach ($ni as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $cid = $item['category_id'] ?? null;
                if ($cid !== null && $cid !== '' && !Validation::uuid((string) $cid)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Identifiant de catégorie invalide dans nursing_items.',
                        'code' => 'VALIDATION_ERROR',
                    ]);
                    exit;
                }
            }
        }
    }
    
    try {
        logAppointment('Appel à appointmentModel->create', ['user_id' => $user['user_id'], 'role' => $user['role']]);
        $createUserId = (string) $user['user_id'];
        $createUserRole = (string) ($user['role'] ?? '');
        $notifyCreatorRole = $createUserRole;

        if (($user['role'] ?? '') === 'super_admin' && !empty($input['on_behalf_of_user_id'])) {
            $onBehalfId = trim((string) $input['on_behalf_of_user_id']);
            if (!Validation::uuid($onBehalfId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Identifiant créateur invalide',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            $stmtOb = $db->prepare('SELECT id, role, banned_until FROM profiles WHERE id = ? LIMIT 1');
            $stmtOb->execute([$onBehalfId]);
            $obRow = $stmtOb->fetch(PDO::FETCH_ASSOC);
            if (!$obRow || !in_array($obRow['role'] ?? '', ['pro', 'nurse'], true)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le créateur doit être un professionnel ou un infirmier actif',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            if (!empty($obRow['banned_until']) && strtotime((string) $obRow['banned_until']) > time()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le profil sélectionné est suspendu ou banni',
                    'code' => 'VALIDATION_ERROR',
                ]);
                exit;
            }
            $createUserId = $onBehalfId;
            $createUserRole = (string) $obRow['role'];
            $notifyCreatorRole = $createUserRole;
        }

        $id = $appointmentModel->create($inputForCreate, $createUserId, $createUserRole);
        logAppointment('Rendez-vous créé avec succès', ['appointment_id' => $id]);

        require_once __DIR__ . '/../../lib/admin/AdminDispatchEventLogger.php';
        $dispatchLogger = new AdminDispatchEventLogger($db);
        $dispatchMode = 'zone';
        if ($externalNurseInvite !== null && ($inputForCreate['type'] ?? '') === 'nursing') {
            $dispatchMode = 'external_invite';
        } elseif (!empty($inputForCreate['assigned_nurse_id']) || !empty($inputForCreate['assigned_lab_id'])) {
            // QR / fiche infirmier ou lab : attribution directe (pas de zone)
            $dispatchMode = 'direct_assign';
        } elseif (($user['role'] ?? '') === 'nurse' && ($inputForCreate['type'] ?? '') === 'nursing') {
            $dispatchMode = 'direct_assign';
        } elseif (in_array($user['role'] ?? '', ['lab', 'subaccount'], true) && ($inputForCreate['type'] ?? '') === 'blood_test') {
            $dispatchMode = 'direct_assign';
        } elseif (!empty($inputForCreate['skip_zone_dispatch'])) {
            $dispatchMode = 'direct_assign';
        } elseif (
            ($inputForCreate['type'] ?? '') === 'blood_test'
            && ($inputForCreate['lab_preference_mode'] ?? '') === 'brand_choice'
        ) {
            $dispatchMode = 'patient_brand_choice';
        } elseif (($user['role'] ?? '') === 'super_admin' && $createUserRole === 'super_admin') {
            $dispatchMode = 'manual';
        }
        // Note : assigned_pro_id seul (QR pro) reste en mode « zone » — le pro est notifié à part.
        $dispatchLogger->setDispatchMode($id, $dispatchMode);
        $dispatchLogger->log(
            $id,
            'created',
            $user['user_id'],
            $user['role'],
            null,
            [
                'dispatch_mode' => $dispatchMode,
                'type' => $inputForCreate['type'] ?? null,
                'assigned_pro_id' => $inputForCreate['assigned_pro_id'] ?? null,
                'created_as_user_id' => $createUserId,
                'created_as_role' => $createUserRole,
            ]
        );

        if ($externalNurseInvite !== null && ($inputForCreate['type'] ?? '') === 'nursing') {
            require_once __DIR__ . '/../../lib/NurseInviteService.php';
            try {
                $inviteResult = NurseInviteService::inviteExternalForAppointment($db, $id, $externalNurseInvite, $user['user_id']);
                $inputForCreate['skip_zone_dispatch'] = true;
                $inputForCreate['external_nurse_invite_sent'] = true;
                if (!empty($inviteResult['resolved_nurse_id'])) {
                    $inputForCreate['assigned_nurse_id'] = (string) $inviteResult['resolved_nurse_id'];
                }
                $dispatchLogger->setDispatchMode($id, 'external_invite');
            } catch (Throwable $e) {
                logAppointmentError('invitation infirmier externe', ['error' => $e->getMessage(), 'appointment_id' => $id]);
                http_response_code(503);
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'code' => 'NURSE_INVITE_FAILED',
                    'data' => ['id' => $id],
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        if (StaffPatientConsent::requiresConsent((string) ($user['role'] ?? ''))) {
            $consentPatientId = isset($input['patient_id']) ? (string) $input['patient_id'] : null;
            StaffPatientConsent::logRecorded($user, $consentPatientId, 'appointment_create');
        }

        if (!empty($inputForCreate['attribution_qr_id'])) {
            require_once __DIR__ . '/../../lib/QrCodeService.php';
            $qrService = new QrCodeService();
            try {
                $qrService->recordConversion((string) $inputForCreate['attribution_qr_id'], $id);
            } catch (Throwable $e) {
                error_log('qr_conversion: ' . $e->getMessage());
            }
        }

        if (!empty($input['patient_id'])) {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $qrBooking = !empty($inputForCreate['attribution_qr_id']) || !empty($inputForCreate['utm_qr']);
            $assignedProfId = $inputForCreate['assigned_pro_id']
                ?? $inputForCreate['assigned_nurse_id']
                ?? $inputForCreate['assigned_lab_id']
                ?? null;
            if ($qrBooking && $assignedProfId) {
                try {
                    $userModel->linkPatientProfessional(
                        (string) $input['patient_id'],
                        (string) $assignedProfId,
                        $id,
                        'qr_booking'
                    );
                } catch (Throwable $e) {
                    error_log('PatientProfessionalAccess (qr_booking): ' . $e->getMessage());
                }
            }
            if (in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
                try {
                    $userModel->linkPatientProfessional((string) $input['patient_id'], $user['user_id'], $id, 'appointment_linked');
                } catch (Throwable $e) {
                    error_log('PatientProfessionalAccess (appointment_linked): ' . $e->getMessage());
                }
            }
            
            // Extraire les données à synchroniser depuis form_data ou directement depuis input
            $formData = $input['form_data'] ?? [];
            $profileUpdates = [];
            
            // Vérifier d'abord dans form_data, puis dans input directement
            $checkBirthDate = $formData['birth_date'] ?? $input['birth_date'] ?? null;
            $checkGender = $formData['gender'] ?? $input['gender'] ?? null;
            $checkAddress = $formData['address'] ?? $input['address'] ?? null;
            
            // Synchroniser birth_date, gender, address si présents
            if (!empty($checkBirthDate)) {
                $profileUpdates['birth_date'] = $checkBirthDate;
            }
            
            if (!empty($checkGender)) {
                $profileUpdates['gender'] = $checkGender;
            }
            
            if (!empty($checkAddress)) {
                // S'assurer que le complément est bien inclus dans l'objet address
                // Si address_complement existe séparément dans form_data, l'ajouter à l'objet address
                $addressComplement = $formData['address_complement'] ?? $input['address_complement'] ?? null;
                if (!empty($addressComplement) && empty($checkAddress['complement'])) {
                    $checkAddress['complement'] = $addressComplement;
                }
                $profileUpdates['address'] = $checkAddress;
            }
            
            // Mettre à jour le profil seulement si des données sont à synchroniser
            if (!empty($profileUpdates)) {
                try {
                    $userModel->update($input['patient_id'], $profileUpdates, $user['user_id'], $user['role']);
                } catch (Exception $e) {
                    // Logger l'erreur mais ne pas faire échouer la création du rendez-vous
                    error_log('Erreur lors de la synchronisation du profil: ' . $e->getMessage());
                }
            }
        }
        
        $successJson = json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
        if ($successJson === false) {
            throw new Exception('Erreur encodage JSON (réponse création RDV)');
        }
        header('Content-Length: ' . strlen($successJson));
        echo $successJson;
        if (ob_get_level()) {
            ob_end_flush();
        }
        flush();

        $notifyAppointmentId = $id;
        $notifyInput = $inputForCreate;
        $notifyCreatorRole = $notifyCreatorRole ?? $user['role'];

        // Sous PHP-FPM, fastcgi_finish_request détache le client : le dispatch peut tourner sans timeout navigateur.
        // Sans FastCGI :
        // - mod_php / Apache : shutdown après réponse — OK (processus distincts par requête).
        // - php -S : un seul worker — register_shutdown_function bloque quand même la requête suivante
        //   tant que runPostCreateNotifications n’est pas finie (série de POST multi-RDV = overlay figé).
        //   On délègue alors à un sous-processus CLI (script dédié).
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
            try {
                $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
            } catch (Throwable $e) {
                error_log('runPostCreateNotifications failed: ' . $e->getMessage());
            }
        } elseif (PHP_SAPI === 'cli-server') {
            $bgScript = __DIR__ . '/../../scripts/cli-post-create-notifications.php';
            $tmpPath = tempnam(sys_get_temp_dir(), 'one-pcn-');
            $envelope = json_encode([
                'id' => $notifyAppointmentId,
                'input' => $notifyInput,
                'role' => $notifyCreatorRole,
            ], JSON_UNESCAPED_UNICODE);
            $spawned = false;
            if (is_string($bgScript) && is_file($bgScript) && $tmpPath !== false && $envelope !== false && @file_put_contents($tmpPath, $envelope) !== false) {
                $phpBin = defined('PHP_BINARY') ? PHP_BINARY : 'php';
                $phpExe = $phpBin !== '' && @is_executable($phpBin) ? $phpBin : 'php';
                $cmdLine = implode(' ', [
                    escapeshellarg($phpExe),
                    escapeshellarg($bgScript),
                    escapeshellarg($tmpPath),
                ]);
                try {
                    if (PHP_OS_FAMILY === 'Windows') {
                        pclose(popen('start /B "" ' . $cmdLine . ' 1>NUL 2>NUL', 'r'));
                    } else {
                        exec($cmdLine . ' > /dev/null 2>&1 &');
                    }
                    $spawned = true;
                    logAppointment('cli-server: post-create notifications (sous-processus)', [
                        'appointment_id' => $notifyAppointmentId,
                    ]);
                } catch (Throwable $e) {
                    error_log('cli-server post-create spawn failed: ' . $e->getMessage());
                }
            }
            if (!$spawned) {
                if ($tmpPath !== false) {
                    @unlink($tmpPath);
                }
                logAppointment('cli-server: fallback shutdown post-create (spawn échoué ou script absent)', [
                    'script_exists' => is_file($bgScript),
                ]);
                register_shutdown_function(function () use ($appointmentModel, $notifyAppointmentId, $notifyInput, $notifyCreatorRole) {
                    try {
                        $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
                    } catch (Throwable $e) {
                        error_log('runPostCreateNotifications failed (shutdown): ' . $e->getMessage());
                    }
                });
            }
        } else {
            register_shutdown_function(function () use ($appointmentModel, $notifyAppointmentId, $notifyInput, $notifyCreatorRole) {
                try {
                    $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
                } catch (Throwable $e) {
                    error_log('runPostCreateNotifications failed (shutdown): ' . $e->getMessage());
                }
            });
        }
    } catch (Exception $e) {
        logAppointmentError('ERREUR lors de la création du rendez-vous', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        logAppointment('ERREUR lors de la création du rendez-vous', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
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
