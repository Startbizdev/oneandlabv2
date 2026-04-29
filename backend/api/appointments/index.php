<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';
require_once __DIR__ . '/../../lib/Validation.php';
require_once __DIR__ . '/../../config/cors.php';

/** Logs verbeux : désactivés si APP_ENV=production (après chargement .env par config/database.php). */
function appointmentsVerboseLoggingEnabled(): bool
{
    $env = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '')));
    return $env !== 'production';
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
    logAppointment('=== DEBUT GET /appointments ===');
    
    // Liste des rendez-vous avec filtres
    $status = $_GET['status'] ?? null;
    $type = $_GET['type'] ?? null;
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    // Plafond large : la pagination côté client reste la référence ; évite de tronquer des listes légitimes.
    $limit = min(max($limit, 1), 500);
    $offset = ($page - 1) * $limit;
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
    
    // Vérifier si la colonne relative_id existe avant de faire le JOIN
    try {
        logAppointment('Vérification de l\'existence de la colonne relative_id');
        $checkRelativeColumn = $db->query("
            SELECT COUNT(*) as col_exists 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'appointments' 
            AND COLUMN_NAME = 'relative_id'
        ")->fetch();
        
        $hasRelativeColumn = $checkRelativeColumn && $checkRelativeColumn['col_exists'] > 0;
        logAppointment('Colonne relative_id existe?', ['exists' => $hasRelativeColumn]);
    } catch (Exception $e) {
        logAppointment('ERREUR lors de la vérification de la colonne relative_id', ['error' => $e->getMessage()]);
        $hasRelativeColumn = false;
    }
    
    if ($hasRelativeColumn) {
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
                cc.icon as category_icon
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
                cc.icon as category_icon
            FROM appointments a
            LEFT JOIN care_categories cc ON a.category_id = cc.id
            WHERE 1=1
        ';
    }
    $params = [];
    
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
            $sql .= ' AND a.patient_id = ?';
            $params[] = $userId;
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
                $sql .= " AND a.type = 'nursing' AND a.status = 'pending' AND a.assigned_nurse_id IS NULL AND EXISTS (SELECT 1 FROM appointment_offers o2 WHERE o2.appointment_id = a.id AND o2.profile_id = ?)";
                $params[] = $userId;
            } elseif ($nurseSegment === 'acceptes') {
                $sql .= " AND a.type = 'nursing' AND a.assigned_nurse_id = ? AND a.status IN ('confirmed','inProgress','planned','completed')";
                $params[] = $userId;
            } elseif ($nurseSegment === 'historique') {
                $sql .= " AND a.type = 'nursing' AND a.assigned_nurse_id = ? AND a.status IN ('completed','canceled','cancelled','refused')";
                $params[] = $userId;
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
        } elseif ($role === 'pro') {
            // Pro : RDV créés par ce professionnel OU patients liés via patient_professional_access (PPA)
            $sql .= ' AND (
                a.created_by = ?
                OR EXISTS (
                    SELECT 1 FROM patient_professional_access ppa
                    WHERE ppa.patient_id = a.patient_id AND ppa.professional_id = ?
                )
            )';
            $params[] = $userId;
            $params[] = $userId;
        }
        // super_admin sans user_id voit tout (pas de filtre supplémentaire)
    }
    
    // Compter le total - construire la requête COUNT à partir de la requête principale
    logAppointment('Construction de la requête COUNT');
    logAppointment('SQL avant COUNT', ['sql' => $sql, 'params' => $params]);
    
    // Utiliser une approche plus simple : remplacer SELECT ... FROM par SELECT COUNT(*)
    $countSql = $sql;
    if ($hasRelativeColumn) {
        // Remplacer la partie SELECT par COUNT(DISTINCT a.id)
        $countSql = preg_replace('/SELECT[\s\S]*?FROM/', 'SELECT COUNT(DISTINCT a.id) as total FROM', $countSql);
    } else {
        // Remplacer la partie SELECT par COUNT(*)
        $countSql = preg_replace('/SELECT[\s\S]*?FROM/', 'SELECT COUNT(*) as total FROM', $countSql);
    }
    // Retirer ORDER BY et LIMIT si présents
    $countSql = preg_replace('/\s+ORDER BY[\s\S]*$/i', '', $countSql);
    $countSql = preg_replace('/\s+LIMIT[\s\S]*$/i', '', $countSql);
    
    logAppointment('Requête COUNT construite', ['countSql' => $countSql]);
    
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
    
    // Récupérer les résultats avec pagination
    // Utiliser des valeurs entières directement dans la requête pour LIMIT et OFFSET
    // car certains drivers PDO ne supportent pas les placeholders pour LIMIT/OFFSET
    // Infirmier : trier par date de création d’abord — un lot bilan + soin a souvent des scheduled_at différents,
    // avec ORDER BY scheduled_at seul le soin peut se retrouver loin (ou sur une autre page) alors qu’il vient d’être créé.
    $orderBy = ' ORDER BY a.scheduled_at DESC';
    if ($user && ($user['role'] ?? '') === 'nurse') {
        $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
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
                $decryptedAppointments[] = $decrypted;
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
        // Batch lookup des noms d'affichage (lab, nurse, préleveur)
        $userIds = [];
        foreach ($decryptedAppointments as $apt) {
            if (!empty($apt['assigned_lab_id'])) $userIds[] = $apt['assigned_lab_id'];
            if (!empty($apt['assigned_nurse_id'])) $userIds[] = $apt['assigned_nurse_id'];
            if (!empty($apt['assigned_to'])) $userIds[] = $apt['assigned_to'];
        }
        if (!empty($userIds)) {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $displayNames = $userModel->getDisplayNamesByIds($userIds);
            foreach ($decryptedAppointments as &$apt) {
                $apt['assigned_lab_display_name'] = $displayNames[$apt['assigned_lab_id'] ?? ''] ?? null;
                $apt['assigned_nurse_display_name'] = $displayNames[$apt['assigned_nurse_id'] ?? ''] ?? null;
                $apt['assigned_to_display_name'] = $displayNames[$apt['assigned_to'] ?? ''] ?? null;
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
    echo json_encode([
        'success' => true,
        'data' => $decryptedAppointments,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => $pages,
            'has_more' => $hasMore,
        ],
    ]);
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
    
    try {
        logAppointment('Appel à appointmentModel->create', ['user_id' => $user['user_id'], 'role' => $user['role']]);
        $id = $appointmentModel->create($inputForCreate, $user['user_id'], $user['role']);
        logAppointment('Rendez-vous créé avec succès', ['appointment_id' => $id]);

        if (!empty($input['patient_id'])) {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
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
        
        echo json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
        if (ob_get_level()) {
            ob_end_flush();
        }
        flush();
        // Réponse envoyée au client, on peut lancer le dispatch sans bloquer
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        // Toujours exécuter le dispatch directement : exec() échoue souvent sous PHP-FPM
        // (PATH, disable_functions, etc.). Le client a déjà reçu la réponse.
        try {
            $appointmentModel->runPostCreateNotifications($id, $inputForCreate, $user['role']);
        } catch (Throwable $e) {
            error_log('runPostCreateNotifications failed: ' . $e->getMessage());
        }
    } catch (Exception $e) {
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
