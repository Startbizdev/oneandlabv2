<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../config/cors.php';

// Fonction de logging
function logAppointment($message, $data = null) {
    $logFile = __DIR__ . '/../../logs/appointments.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data !== null) {
        $logMessage .= "\n" . print_r($data, true);
    }
    $logMessage .= "\n" . str_repeat('-', 80) . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
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
    $offset = ($page - 1) * $limit;
    
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
                cc.type as category_type
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
                cc.type as category_type
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
            logAppointment('Filtrage pour infirmier', ['user_id' => $userId, 'status' => $status]);
            $sql .= " AND a.type = 'nursing'";
            // Assignés à moi OU offerts à moi (pending, dans appointment_offers) — même logique que les labs
            $sql .= " AND (a.assigned_nurse_id = ? OR (a.assigned_nurse_id IS NULL AND a.status = 'pending' AND EXISTS (SELECT 1 FROM appointment_offers o WHERE o.appointment_id = a.id AND o.profile_id = ?)))";
            $params[] = $userId;
            $params[] = $userId;

            // Filtrer selon les préférences de catégories de l'infirmier
            // Si l'infirmier n'a pas de préférences, accepter tous les rendez-vous
            // Si l'infirmier a des préférences, seulement ceux qui correspondent
            $prefsCheckSql = 'SELECT COUNT(*) as count FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = TRUE';
            $prefsStmt = $db->prepare($prefsCheckSql);
            $prefsStmt->execute([$userId]);
            $prefsCount = $prefsStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($prefsCount > 0) {
                // L'infirmier a des préférences, filtrer selon celles-ci
                $sql .= ' AND (
                    a.category_id IS NULL OR
                    a.category_id IN (
                        SELECT category_id
                        FROM nurse_category_preferences
                        WHERE nurse_id = ? AND is_enabled = TRUE
                    )
                )';
                $params[] = $userId;
                logAppointment('Filtrage par préférences de catégories', ['prefs_count' => $prefsCount]);
            } else {
                // Pas de préférences, accepter tous les rendez-vous
                logAppointment('Aucune préférence de catégorie, tous les rendez-vous acceptés');
            }
        } elseif ($role === 'lab') {
            // Lab : RDV assignés à l'équipe OU RDV offerts (pending) à l'équipe — prises de sang uniquement
            $teamStmt = $db->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
            $teamStmt->execute([$userId, $userId]);
            $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
            if (empty($teamIds)) {
                $teamIds = [$userId];
            }
            $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
            $sql .= " AND a.type = 'blood_test' AND (a.assigned_lab_id IN ($placeholders) OR (a.assigned_lab_id IS NULL AND a.status = 'pending' AND EXISTS (SELECT 1 FROM appointment_offers o WHERE o.appointment_id = a.id AND o.profile_id IN ($placeholders))))";
            $params = array_merge($params, $teamIds, $teamIds);
        } elseif ($role === 'subaccount') {
            $sql .= " AND a.type = 'blood_test' AND (a.assigned_lab_id = ? OR (a.assigned_lab_id IS NULL AND a.status = 'pending' AND EXISTS (SELECT 1 FROM appointment_offers o WHERE o.appointment_id = a.id AND o.profile_id = ?)))";
            $params[] = $userId;
            $params[] = $userId;
        } elseif ($role === 'preleveur') {
            // Les préleveurs sont assignés via assigned_lab_id (ils appartiennent à un labo)
            // Pour l'instant, on utilise assigned_to comme fallback pour compatibilité
            // TODO: Migrer vers assigned_lab_id uniquement
            $sql .= ' AND (a.assigned_lab_id = ? OR a.assigned_to = ?) AND a.type = "blood_test"';
            $params[] = $userId;
            $params[] = $userId;
        } elseif ($role === 'pro') {
            // Pro : RDV créés par ce professionnel (prise en charge pour ses patients)
            $sql .= ' AND a.created_by = ?';
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
    $sql .= ' ORDER BY scheduled_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    
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
    
    // Déchiffrer les données si utilisateur authentifié
    $decryptedAppointments = [];
    foreach ($appointments as $appointment) {
        if ($user) {
            try {
                $decrypted = $appointmentModel->getById($appointment['id'], $user['user_id'], $user['role']);
                if ($decrypted) {
                    $decryptedAppointments[] = $decrypted;
                }
            } catch (Exception $e) {
                // Logger l'erreur mais continuer avec les autres rendez-vous
                error_log('Erreur lors du déchiffrement du rendez-vous ' . $appointment['id'] . ': ' . $e->getMessage());
                // Ajouter quand même les données de base sans déchiffrement
                $decryptedAppointments[] = [
                    'id' => $appointment['id'],
                    'type' => $appointment['type'],
                    'status' => $appointment['status'],
                    'scheduled_at' => $appointment['scheduled_at'],
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        } else {
            // Sans authentification, retourner seulement les champs non sensibles
            $decryptedAppointments[] = [
                'id' => $appointment['id'],
                'type' => $appointment['type'],
                'status' => $appointment['status'],
                'scheduled_at' => $appointment['scheduled_at'],
            ];
        }
    }
    
    logAppointment('=== FIN GET /appointments - SUCCES ===', [
        'total' => $total,
        'returned' => count($decryptedAppointments)
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => $decryptedAppointments,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
    
    try {
        logAppointment('Appel à appointmentModel->create', ['user_id' => $user['user_id'], 'role' => $user['role']]);
        $id = $appointmentModel->create($input, $user['user_id'], $user['role']);
        logAppointment('Rendez-vous créé avec succès', ['appointment_id' => $id]);
        
        // Synchroniser les données du formulaire avec le profil utilisateur si patient_id est présent
        if (!empty($input['patient_id'])) {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            
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
        // Dispatch + notifications en arrière-plan pour éviter timeout/crash du serveur
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        $workerScript = realpath(__DIR__ . '/../../scripts/process-appointment-notifications.php');
        if ($workerScript && is_readable($workerScript)) {
            $php = defined('PHP_BINARY') ? PHP_BINARY : 'php';
            $cmd = sprintf('%s %s %s > /dev/null 2>&1 &', escapeshellcmd($php), escapeshellarg($workerScript), escapeshellarg($id));
            if (DIRECTORY_SEPARATOR === '\\') {
                pclose(popen('start /B ' . $cmd, 'r'));
            } else {
                exec($cmd);
            }
        } else {
            try {
                $appointmentModel->runPostCreateNotifications($id, $input);
            } catch (Throwable $e) {
                error_log('runPostCreateNotifications failed: ' . $e->getMessage());
            }
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
