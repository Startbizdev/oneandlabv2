<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/upload-limits.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/NotificationService.php';
require_once __DIR__ . '/../../lib/EmailQueue.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/medical-documents/bootstrap.php';
require_once __DIR__ . '/../../lib/UploadMimeTypes.php';
require_once __DIR__ . '/../../lib/AppTimezone.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$crypto = new Crypto();
$logger = new Logger();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $appointmentId = $_GET['appointment_id'] ?? null;
    
    if (!$appointmentId) {
        if ($user['role'] === 'patient') {
            require_once __DIR__ . '/../../lib/PatientDocumentLibrary.php';
            try {
                $documents = PatientDocumentLibrary::list($db, (string) $user['user_id']);
                $logger->log($user['user_id'], 'patient', 'read', 'medical_document', null, ['scope' => 'own_document_library', 'count' => count($documents)]);
                echo json_encode(['success' => true, 'data' => $documents]);
            } catch (Throwable $error) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Chargement des documents impossible']);
            }
            exit;
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'appointment_id requis']);
        exit;
    }
    
    try {
        // Vérifier les permissions (patient, professionnel assigné, ou admin) - inclure relative_id
        $stmt = $db->prepare('
            SELECT 
                patient_id,
                relative_id,
                assigned_to,
                assigned_nurse_id,
                assigned_lab_id,
                created_by
            FROM appointments
            WHERE id = ?
        ');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
            exit;
        }
        
        if (!MedicalDocumentAppointmentAccess::userCanAccessAppointment($user, $appointment, $db)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }

        $documents = MedicalDocumentListQuery::listForAppointment($db, $user, $appointment, $appointmentId);

        // Logger l'accès
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'medical_document',
            $appointmentId,
            ['count' => count($documents)]
        );
        
        echo json_encode([
            'success' => true,
            'data' => $documents,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Upload de document médical avec fichier réel
    try {
        // Vérifier si c'est un upload multipart/form-data
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Fichier requis ou erreur d\'upload']);
            exit;
        }
        
        $appointmentId = isset($_POST['appointment_id']) ? trim((string) $_POST['appointment_id']) : '';
        if ($appointmentId === '') {
            $appointmentId = null;
        }
        $postPatientId = isset($_POST['patient_id']) ? trim((string) $_POST['patient_id']) : '';
        if ($postPatientId === '') {
            $postPatientId = null;
        }
        $documentType = $_POST['document_type'] ?? null;
        $allowedTypes = ['carte_vitale', 'carte_mutuelle', 'attestation_droits_ame', 'ordonnance', 'autres_assurances', 'resultats', 'other', 'cancellation_photo'];
        $documentType = in_array($documentType ?? '', $allowedTypes, true) ? $documentType : 'other';

        $appointment = null;
        $standaloneOrdonnance = false;
        $standalonePatientDoc = false;

        if (!$appointmentId) {
            if ($documentType === 'ordonnance' && $postPatientId && in_array($user['role'], ['pro', 'nurse', 'super_admin'], true)) {
                require_once __DIR__ . '/../../lib/PrescriptionService.php';
                if (!PrescriptionService::canGenerateForPatient($user, $postPatientId, $db)) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Accès refusé à ce patient']);
                    exit;
                }
                $standaloneOrdonnance = true;
            } elseif (
                $user['role'] === 'patient'
                && ($postPatientId === null || $postPatientId === '' || $postPatientId === $user['user_id'])
            ) {
                $standalonePatientDoc = true;
                $postPatientId = (string) $user['user_id'];
                $allowedChatTypes = ['ordonnance', 'resultats', 'other'];
                if (!in_array($documentType, $allowedChatTypes, true)) {
                    $documentType = 'other';
                }
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'appointment_id requis']);
                exit;
            }
        } else {
            // Vérifier les permissions (inclure relative_id pour documents proche)
            $stmt = $db->prepare('
                SELECT patient_id, relative_id, assigned_to, assigned_nurse_id, assigned_lab_id, created_by, created_by_role
                FROM appointments
                WHERE id = ?
            ');
            $stmt->execute([$appointmentId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$appointment) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
                exit;
            }

            if (!MedicalDocumentAppointmentAccess::userCanUploadOnAppointment($user, $appointment, $db)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Accès refusé']);
                exit;
            }
        }
        
        // Validation du fichier
        $file = $_FILES['file'];
        $maxSize = ONEANDLAB_MAX_UPLOAD_BYTES;
        $allowedTypes = UploadMimeTypes::MEDICAL_DOCUMENT;
        
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 25 Mo)']);
            exit;
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        // finfo_close($finfo); // Deprecated in PHP 8.5, freed automatically
        
        if (!in_array($mimeType, $allowedTypes, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Type de fichier non autorisé']);
            exit;
        }
        
        // Lire le contenu du fichier
        $fileContent = file_get_contents($file['tmp_name']);
        if ($fileContent === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la lecture du fichier']);
            exit;
        }
        
        // Chiffrer le fichier
        $encryptedData = $crypto->encryptFile($fileContent);
        
        // Créer le dossier d'upload s'il n'existe pas (backend/uploads/medical/ pour cohérence avec patient-documents)
        $backendDir = realpath(__DIR__ . '/../../');
        if ($backendDir === false) {
            $backendDir = __DIR__ . '/../../';
        }
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Générer un ID unique pour le fichier
        $id = bin2hex(random_bytes(16));
        $fileName = UploadMimeTypes::safeFilename((string) $file['name'], $mimeType);
        
        // Créer le dossier pour ce document
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        
        // Sauvegarder le fichier chiffré
        $filePath = $documentDir . $fileName . '.encrypted';
        $decryptedContent = base64_decode($encryptedData['encrypted']);
        if ($decryptedContent === false) {
            throw new Exception('Erreur lors du décodage base64 du fichier');
        }
        
        $writeResult = file_put_contents($filePath, $decryptedContent);

        if ($writeResult === false || !file_exists($filePath)) {
            throw new Exception('Erreur lors de l\'écriture du fichier sur le serveur. Vérifiez les permissions du dossier uploads/medical/');
        }
        
        // Stocker les métadonnées en base
        $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';

        $prescriptionKind = null;
        if ($documentType === 'ordonnance' && isset($_POST['prescription_kind'])) {
            $kindRaw = trim((string) $_POST['prescription_kind']);
            if (in_array($kindRaw, ['medical', 'nursing'], true)) {
                $prescriptionKind = $kindRaw;
            }
        }
        $prescriptionText = null;
        if ($documentType === 'ordonnance' && isset($_POST['prescription_text'])) {
            $textRaw = trim((string) $_POST['prescription_text']);
            if ($textRaw !== '') {
                $prescriptionText = $textRaw;
            }
        }
        $prescriptionNumber = null;
        if ($documentType === 'ordonnance' && isset($_POST['prescription_number'])) {
            $numRaw = trim((string) $_POST['prescription_number']);
            if ($numRaw !== '') {
                $prescriptionNumber = substr($numRaw, 0, 32);
            }
        }
        $generatedAt = ($documentType === 'ordonnance' && ($prescriptionKind || $prescriptionText || $prescriptionNumber))
            ? AppTimezone::sqlDateTime()
            : null;

        $patientIdForDoc = $standaloneOrdonnance || $standalonePatientDoc
            ? $postPatientId
            : ($appointment['patient_id'] ?? null);

        $stmt = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, patient_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, prescription_kind, prescription_text,
                prescription_number, generated_at, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');

        $stmt->execute([
            $id,
            $appointmentId,
            $patientIdForDoc,
            $user['user_id'],
            $fileName,
            $relativePath,
            $file['size'],
            $mimeType,
            $documentType,
            $prescriptionKind,
            $prescriptionText,
            $prescriptionNumber,
            $generatedAt,
            1,
            $encryptedData['dek'],
        ]);

        // Logger l'upload
        $logger->log(
            $user['user_id'],
            $user['role'],
            'create',
            'medical_document',
            $id,
            [
                'appointment_id' => $appointmentId,
                'file_name' => $fileName,
                'file_size' => $file['size'],
                'mime_type' => $mimeType,
            ]
        );
        
        // Si c'est un document de profil (carte_vitale, carte_mutuelle, autres_assurances),
        // sauvegarder dans patient_documents ou patient_relative_documents selon le RDV
        $profileDocumentTypes = ['carte_vitale', 'carte_mutuelle', 'attestation_droits_ame', 'autres_assurances'];
        $patientIdForProfile = $standaloneOrdonnance ? $postPatientId : ($appointment['patient_id'] ?? null);
        $relativeIdForProfile = $standaloneOrdonnance ? null : ($appointment['relative_id'] ?? null);
        if ($documentType && in_array($documentType, $profileDocumentTypes, true) && $patientIdForProfile) {
            try {
                if ($relativeIdForProfile) {
                    // RDV pour un proche : sauvegarder dans patient_relative_documents
                    $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
                    if ($tableExists) {
                        $checkRel = $db->prepare('SELECT id FROM patient_relatives WHERE id = ? AND patient_id = ?');
                        $checkRel->execute([$relativeIdForProfile, $patientIdForProfile]);
                        if ($checkRel->fetch()) {
                            $checkStmt = $db->prepare('
                                SELECT id FROM patient_relative_documents
                                WHERE patient_id = ? AND relative_id = ? AND document_type = ?
                            ');
                            $checkStmt->execute([$patientIdForProfile, $relativeIdForProfile, $documentType]);
                            $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
                            if ($existingDoc) {
                                $updateStmt = $db->prepare('
                                    UPDATE patient_relative_documents
                                    SET medical_document_id = ?, updated_at = NOW()
                                    WHERE id = ?
                                ');
                                $updateStmt->execute([$id, $existingDoc['id']]);
                            } else {
                                $prDocId = bin2hex(random_bytes(16));
                                $insertStmt = $db->prepare('
                                    INSERT INTO patient_relative_documents (
                                        id, patient_id, relative_id, document_type, medical_document_id, created_at, updated_at
                                    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                                ');
                                $insertStmt->execute([
                                    $prDocId,
                                    $patientIdForProfile,
                                    $relativeIdForProfile,
                                    $documentType,
                                    $id
                                ]);
                            }
                        }
                    }
                } else {
                    // RDV pour le patient : sauvegarder dans patient_documents
                    $checkStmt = $db->prepare('
                        SELECT id FROM patient_documents 
                        WHERE patient_id = ? AND document_type = ?
                    ');
                    $checkStmt->execute([$patientIdForProfile, $documentType]);
                    $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    if ($existingDoc) {
                        $updateStmt = $db->prepare('
                            UPDATE patient_documents 
                            SET medical_document_id = ?, updated_at = NOW()
                            WHERE id = ?
                        ');
                        $updateStmt->execute([$id, $existingDoc['id']]);
                    } else {
                        $patientDocId = bin2hex(random_bytes(16));
                        $insertStmt = $db->prepare('
                            INSERT INTO patient_documents (
                                id, patient_id, document_type, medical_document_id, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, NOW(), NOW())
                        ');
                        $insertStmt->execute([
                            $patientDocId,
                            $patientIdForProfile,
                            $documentType,
                            $id
                        ]);
                    }
                }
            } catch (Exception $e) {
                error_log('Erreur lors de la sauvegarde dans patient_documents/patient_relative_documents: ' . $e->getMessage());
            }
        }
        
        if ($documentType === 'resultats') {
            $patientId = $appointment['patient_id'] ?? null;
            if ($patientId) {
                try {
                    $notificationService = new NotificationService();
                    $notificationService->createNotification(
                        $patientId,
                        'results_ready',
                        'Vos résultats sont disponibles',
                        'Les résultats d’analyses de votre rendez-vous sont en ligne. Ouvrez le rendez-vous pour les consulter ou les télécharger (onglet Résultats).',
                        ['appointment_id' => $appointmentId]
                    );
                    $patientEmail = null;
                    $profileStmt = $db->prepare('SELECT email_encrypted, email_dek FROM profiles WHERE id = ?');
                    $profileStmt->execute([$patientId]);
                    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);
                    if ($profile && !empty($profile['email_encrypted']) && !empty($profile['email_dek'])) {
                        $patientEmail = $crypto->decryptField($profile['email_encrypted'], $profile['email_dek']);
                    }
                    if ($patientEmail) {
                        EmailQueue::add('results_ready', $patientEmail, ['appointment_id' => $appointmentId]);
                    }
                } catch (Exception $e) {
                    error_log('Erreur notification/email résultats: ' . $e->getMessage());
                }
            }
            // Infirmiers concernés : assigné, créateur du RDV (bilan sanguin), créateur du dossier patient
            $nurseIds = [];
            $assignedNurseId = (string) ($appointment['assigned_nurse_id'] ?? '');
            if ($assignedNurseId !== '') {
                $nurseIds[$assignedNurseId] = true;
            }
            $aptCreatorId = (string) ($appointment['created_by'] ?? '');
            $aptCreatorRole = (string) ($appointment['created_by_role'] ?? '');
            if ($aptCreatorId !== '' && $aptCreatorRole === 'nurse') {
                $nurseIds[$aptCreatorId] = true;
            }
            if ($patientId) {
                $patNurseStmt = $db->prepare('
                    SELECT p.created_by, pr.role AS creator_role
                    FROM profiles p
                    LEFT JOIN profiles pr ON pr.id = p.created_by
                    WHERE p.id = ?
                    LIMIT 1
                ');
                $patNurseStmt->execute([$patientId]);
                $patNurseRow = $patNurseStmt->fetch(PDO::FETCH_ASSOC);
                if ($patNurseRow && ($patNurseRow['creator_role'] ?? '') === 'nurse' && !empty($patNurseRow['created_by'])) {
                    $nurseIds[(string) $patNurseRow['created_by']] = true;
                }
            }
            if ($nurseIds !== []) {
                try {
                    $notificationService = new NotificationService();
                    $patientLabel = 'Patient';
                    if ($patientId) {
                        $np = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM profiles WHERE id = ?');
                        $np->execute([$patientId]);
                        $prow = $np->fetch(PDO::FETCH_ASSOC);
                        if ($prow && !empty($prow['first_name_encrypted']) && !empty($prow['first_name_dek'])) {
                            $fn = $crypto->decryptField($prow['first_name_encrypted'], $prow['first_name_dek']);
                            $ln = (!empty($prow['last_name_encrypted']) && !empty($prow['last_name_dek']))
                                ? $crypto->decryptField($prow['last_name_encrypted'], $prow['last_name_dek'])
                                : '';
                            $patientLabel = trim($fn . ' ' . $ln) ?: 'Patient';
                        }
                    }
                    $uploaderId = (string) ($user['user_id'] ?? '');
                    foreach (array_keys($nurseIds) as $nurseId) {
                        if ($nurseId === $uploaderId) {
                            continue;
                        }
                        $notificationService->createNotification(
                            $nurseId,
                            'results_available',
                            'Résultats disponibles',
                            'De nouveaux résultats d’analyses sont disponibles pour le rendez-vous de ' . $patientLabel . '.',
                            [
                                'appointment_id' => $appointmentId,
                                'medical_document_id' => $id,
                            ]
                        );
                    }
                } catch (Exception $e) {
                    error_log('Erreur notification infirmier résultats: ' . $e->getMessage());
                }
            }

            $proIds = [];
            if ($aptCreatorId !== '' && $aptCreatorRole === 'pro') {
                $proIds[$aptCreatorId] = true;
            }
            if ($patientId) {
                $patCreatorStmt = $db->prepare('
                    SELECT p.created_by, pr.role AS creator_role
                    FROM profiles p
                    LEFT JOIN profiles pr ON pr.id = p.created_by
                    WHERE p.id = ?
                    LIMIT 1
                ');
                $patCreatorStmt->execute([$patientId]);
                $patCreatorRow = $patCreatorStmt->fetch(PDO::FETCH_ASSOC);
                if ($patCreatorRow && ($patCreatorRow['creator_role'] ?? '') === 'pro' && !empty($patCreatorRow['created_by'])) {
                    $proIds[(string) $patCreatorRow['created_by']] = true;
                }
                try {
                    $ppaStmt = $db->prepare('
                        SELECT ppa.professional_id
                        FROM patient_professional_access ppa
                        INNER JOIN profiles pr ON pr.id = ppa.professional_id AND pr.role = ?
                        WHERE ppa.patient_id = ?
                    ');
                    $ppaStmt->execute(['pro', $patientId]);
                    foreach ($ppaStmt->fetchAll(PDO::FETCH_ASSOC) as $ppaRow) {
                        if (!empty($ppaRow['professional_id'])) {
                            $proIds[(string) $ppaRow['professional_id']] = true;
                        }
                    }
                } catch (Exception $e) {
                    error_log('Erreur lookup PPA pro résultats: ' . $e->getMessage());
                }
            }
            if ($proIds !== []) {
                try {
                    $notificationService = new NotificationService();
                    $patientLabel = 'Patient';
                    if ($patientId) {
                        $np = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM profiles WHERE id = ?');
                        $np->execute([$patientId]);
                        $prow = $np->fetch(PDO::FETCH_ASSOC);
                        if ($prow && !empty($prow['first_name_encrypted']) && !empty($prow['first_name_dek'])) {
                            $fn = $crypto->decryptField($prow['first_name_encrypted'], $prow['first_name_dek']);
                            $ln = (!empty($prow['last_name_encrypted']) && !empty($prow['last_name_dek']))
                                ? $crypto->decryptField($prow['last_name_encrypted'], $prow['last_name_dek'])
                                : '';
                            $patientLabel = trim($fn . ' ' . $ln) ?: 'Patient';
                        }
                    }
                    foreach (array_keys($proIds) as $proId) {
                        if ($proId === (string) ($user['user_id'] ?? '')) {
                            continue;
                        }
                        $notificationService->createNotification(
                            $proId,
                            'results_available',
                            'Résultats disponibles',
                            'De nouveaux résultats d’analyses sont disponibles pour ' . $patientLabel . '.',
                            [
                                'appointment_id' => $appointmentId,
                                'medical_document_id' => $id,
                            ]
                        );
                    }
                } catch (Exception $e) {
                    error_log('Erreur notification pro résultats: ' . $e->getMessage());
                }
            }
        }

        if (in_array($documentType, ['resultats', 'ordonnance', 'autre'], true)) {
            try {
                require_once __DIR__ . '/../../lib/rag/AiDocumentJobService.php';
                $resolvedPatient = $postPatientId
                    ?? ($appointment['patient_id'] ?? null)
                    ?? (($user['role'] ?? '') === 'patient' ? ($user['user_id'] ?? null) : null);
                if ($resolvedPatient) {
                    (new AiDocumentJobService($db))->queueDocument((string) $resolvedPatient, (string) $id);
                }
            } catch (Throwable $ocrQueueErr) {
                error_log('Queue OCR IA: ' . $ocrQueueErr->getMessage());
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $id,
                'file_name' => $fileName,
                'file_size' => $file['size'],
                'mime_type' => $mimeType,
            ],
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
