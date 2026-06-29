<?php


header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/upload-limits.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/UploadMimeTypes.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
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

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Vérifier CSRF
CSRFMiddleware::handle();

// Patient : ses documents ; super_admin : upload pour un patient via POST user_id ; pro/nurse/lab/sous-compte : patient du périmètre
$targetPatientId = $user['user_id'];
if ($user['role'] === 'super_admin') {
    $requestedUserId = isset($_POST['user_id']) ? trim((string) $_POST['user_id']) : null;
    if ($requestedUserId !== null && $requestedUserId !== '') {
        $targetPatientId = $requestedUserId;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paramètre user_id requis pour l\'admin']);
        exit;
    }
} elseif (in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
    $requestedUserId = isset($_POST['user_id']) ? trim((string) $_POST['user_id']) : null;
    if ($requestedUserId === null || $requestedUserId === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paramètre user_id requis (patient)']);
        exit;
    }
    $targetPatientId = $requestedUserId;
} elseif ($user['role'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

// Patient / staff : optionnellement relative_id pour les documents d'un proche
$relativeId = null;
$rolesWithRelativeUpload = ['patient', 'preleveur', 'pro', 'nurse', 'lab', 'subaccount'];
if (in_array($user['role'], $rolesWithRelativeUpload, true)) {
    $relativeId = isset($_POST['relative_id']) ? trim((string) $_POST['relative_id']) : null;
    if ($relativeId !== null && $relativeId === '') {
        $relativeId = null;
    }
}

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
$userModel = new User();

// Staff : même périmètre que patient-history (créateur, PPA, RDV assigné…)
if (in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
    if (!PatientDossierAccess::canAccess($db, $userModel, $user, $targetPatientId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
}

if ($user['role'] === 'preleveur') {
    if ($relativeId) {
        $chk = $db->prepare('SELECT 1 FROM appointments WHERE patient_id = ? AND type = ? AND assigned_to = ? AND relative_id = ? LIMIT 1');
        $chk->execute([$targetPatientId, 'blood_test', $user['user_id'], $relativeId]);
    } else {
        $chk = $db->prepare('SELECT 1 FROM appointments WHERE patient_id = ? AND type = ? AND assigned_to = ? LIMIT 1');
        $chk->execute([$targetPatientId, 'blood_test', $user['user_id']]);
    }
    if (!$chk->fetchColumn()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploadVerbose = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: ''))) !== 'production';
    $logFile = null;
    if ($uploadVerbose) {
        $backendDirForLog = realpath(__DIR__ . '/../../');
        if ($backendDirForLog === false) {
            $backendDirForLog = __DIR__ . '/../../';
        }
        $logFile = rtrim($backendDirForLog, DIRECTORY_SEPARATOR) . '/uploads/upload-debug.log';
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        $timestamp = date('Y-m-d H:i:s');
        $logMsg = "\n[$timestamp] === UPLOAD START ===\n";
        $logMsg .= "User: " . $user['user_id'] . " (" . $user['role'] . ")\n";
        $logMsg .= "FILES: " . json_encode($_FILES) . "\n";
        $logMsg .= "POST: " . json_encode($_POST) . "\n";
        file_put_contents($logFile, $logMsg, FILE_APPEND);
        error_log("=== UPLOAD START ===");
        error_log("User: " . $user['user_id'] . " (" . $user['role'] . ")");
    }
    
    try {
        // Vérifier si c'est un upload multipart/form-data
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = 'Fichier requis ou erreur d\'upload';
            if (isset($_FILES['file']['error'])) {
                $uploadErrors = [
                    UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (php.ini)',
                    UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux (formulaire)',
                    UPLOAD_ERR_PARTIAL => 'Upload partiel',
                    UPLOAD_ERR_NO_FILE => 'Aucun fichier',
                    UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire manquant',
                    UPLOAD_ERR_CANT_WRITE => 'Impossible d\'écrire sur le disque',
                    UPLOAD_ERR_EXTENSION => 'Extension PHP a arrêté l\'upload',
                ];
                $errorMsg .= ' - Code erreur: ' . $_FILES['file']['error'] . ' - ' . ($uploadErrors[$_FILES['file']['error']] ?? 'Erreur inconnue');
            }
            error_log("ERROR: " . $errorMsg);
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $errorMsg]);
            exit;
        }
        
        error_log("File received: " . $_FILES['file']['name'] . " (" . $_FILES['file']['size'] . " bytes)");

        $documentType = $_POST['document_type'] ?? null;
        $allowedTypes = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];

        if (!$documentType || !in_array($documentType, $allowedTypes, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Type de document invalide']);
            exit;
        }

        // Validation du fichier
        $file = $_FILES['file'];
        $maxSize = ONEANDLAB_MAX_UPLOAD_BYTES;
        $allowedMimeTypes = UploadMimeTypes::MEDICAL_DOCUMENT;

        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 25 Mo)']);
            exit;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        // finfo_close($finfo); // Deprecated in PHP 8.5, freed automatically

        if (!in_array($mimeType, $allowedMimeTypes, true)) {
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

        // Créer le dossier d'upload s'il n'existe pas (même chemin que medical-documents : backend/uploads/medical/)
        $backendDir = realpath(__DIR__ . '/../../');
        if ($backendDir === false) {
            $backendDir = __DIR__ . '/../../';
        }
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            if (!@mkdir($uploadDir, 0755, true)) {
                throw new Exception('Impossible de créer le dossier d\'upload: ' . $uploadDir);
            }
        }
        
        // Vérifier que le dossier est accessible en écriture
        if (!is_writable($uploadDir)) {
            throw new Exception('Le dossier d\'upload n\'est pas accessible en écriture: ' . $uploadDir . ' (vérifiez les permissions sur backend/uploads/medical/)');
        }

        // Générer un UUID v4 pour le fichier (même format que le reste du système)
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;

        // Créer le dossier pour ce document
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            if (!mkdir($documentDir, 0755, true)) {
                throw new Exception('Impossible de créer le dossier du document: ' . $documentDir);
            }
        }

        // Sauvegarder le fichier chiffré
        $filePath = $documentDir . $fileName . '.encrypted';
        $encryptedBinary = base64_decode($encryptedData['encrypted'], true);
        if ($encryptedBinary === false) {
            throw new Exception('Erreur lors du décodage base64 du fichier chiffré');
        }
        
        $bytesWritten = file_put_contents($filePath, $encryptedBinary);
        if ($bytesWritten === false) {
            throw new Exception('Impossible d\'écrire le fichier: ' . $filePath . ' - Vérifiez les permissions');
        }
        
        // Vérifier que le fichier a bien été écrit
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            throw new Exception('Le fichier n\'a pas été correctement sauvegardé: ' . $filePath);
        }

        // Documents de profil (Carte Vitale, etc.) : pas de rendez-vous associé (appointment_id NULL)
        $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';

        $stmt = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, encrypted, file_dek, created_at
            ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');

        $result = $stmt->execute([
            $id,
            $user['user_id'],
            $fileName,
            $relativePath,
            $file['size'],
            $mimeType,
            1, // Toujours chiffré
            $encryptedData['dek'],
        ]);
        
        if (!$result) {
            throw new Exception('Erreur lors de la sauvegarde dans medical_documents: ' . implode(', ', $stmt->errorInfo()));
        }

        // Sauvegarder dans patient_documents ou patient_relative_documents
        $relativeOwnerPatientId = $user['role'] === 'patient' ? $user['user_id'] : $targetPatientId;
        if ($relativeId && in_array($user['role'], $rolesWithRelativeUpload, true)) {
            // Documents d'un proche : vérifier que le proche appartient au patient
            $checkRel = $db->prepare('SELECT id FROM patient_relatives WHERE id = ? AND patient_id = ?');
            $checkRel->execute([$relativeId, $relativeOwnerPatientId]);
            if (!$checkRel->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Proche introuvable ou accès refusé']);
                exit;
            }
            $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
            if (!$tableExists) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Table patient_relative_documents non disponible']);
                exit;
            }
            $checkStmt = $db->prepare('
                SELECT id FROM patient_relative_documents
                WHERE patient_id = ? AND relative_id = ? AND document_type = ?
            ');
            $checkStmt->execute([$relativeOwnerPatientId, $relativeId, $documentType]);
            $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingDoc) {
                $updateStmt = $db->prepare('
                    UPDATE patient_relative_documents
                    SET medical_document_id = ?, updated_at = NOW()
                    WHERE id = ?
                ');
                $updateStmt->execute([$id, $existingDoc['id']]);
            } else {
                $data = random_bytes(16);
                $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
                $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
                $prDocId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
                $insertStmt = $db->prepare('
                    INSERT INTO patient_relative_documents (
                        id, patient_id, relative_id, document_type, medical_document_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ');
                $insertResult = $insertStmt->execute([
                    $prDocId,
                    $relativeOwnerPatientId,
                    $relativeId,
                    $documentType,
                    $id
                ]);
                if (!$insertResult) {
                    throw new Exception('Erreur lors de la sauvegarde dans patient_relative_documents: ' . implode(', ', $insertStmt->errorInfo()));
                }
            }
        } else {
            // Documents du patient (pour moi-même)
            $checkStmt = $db->prepare('
                SELECT id FROM patient_documents 
                WHERE patient_id = ? AND document_type = ?
            ');
            $checkStmt->execute([$targetPatientId, $documentType]);
            $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingDoc) {
                $updateStmt = $db->prepare('
                    UPDATE patient_documents 
                    SET medical_document_id = ?, updated_at = NOW()
                    WHERE id = ?
                ');
                $updateStmt->execute([$id, $existingDoc['id']]);
            } else {
                $data = random_bytes(16);
                $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
                $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
                $patientDocId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
                $insertStmt = $db->prepare('
                    INSERT INTO patient_documents (
                        id, patient_id, document_type, medical_document_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, NOW(), NOW())
                ');
                $insertResult = $insertStmt->execute([
                    $patientDocId,
                    $targetPatientId,
                    $documentType,
                    $id
                ]);
                if (!$insertResult) {
                    throw new Exception('Erreur lors de la sauvegarde dans patient_documents: ' . implode(', ', $insertStmt->errorInfo()));
                }
            }
        }

        // Logger l'upload avec le chemin du fichier pour vérification
        $logger->log(
            $user['user_id'],
            $user['role'],
            'create',
            'patient_document',
            $id,
            [
                'document_type' => $documentType,
                'file_name' => $fileName,
                'file_size' => $file['size'],
                'mime_type' => $mimeType,
                'file_path' => $relativePath,
                'file_exists' => file_exists($filePath),
                'file_size_on_disk' => file_exists($filePath) ? filesize($filePath) : 0,
            ]
        );

        $logMsg = "SUCCESS: Document saved - ID: $id, File: $filePath\n";
        $logMsg .= "=== UPLOAD END ===\n";
        if ($uploadVerbose && $logFile !== null) {
            file_put_contents($logFile, $logMsg, FILE_APPEND);
        }

        error_log("SUCCESS: Document saved - ID: $id, File: $filePath");
        error_log("=== UPLOAD END ===");

        $isProd = !$uploadVerbose;
        $payloadData = [
            'id' => $id,
            'document_type' => $documentType,
            'file_name' => $fileName,
            'file_size' => $file['size'],
            'mime_type' => $mimeType,
            'file_path' => $relativePath,
        ];
        if (!$isProd) {
            $payloadData['debug'] = [
                'file_exists' => file_exists($filePath),
                'file_size_on_disk' => file_exists($filePath) ? filesize($filePath) : 0,
                'upload_dir' => $uploadDir,
                'patient_id' => $targetPatientId,
                'relative_id' => $relativeId,
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $payloadData,
        ]);
    } catch (Exception $e) {
        $logMsg = "ERROR: " . $e->getMessage() . "\n";
        $logMsg .= "Trace: " . $e->getTraceAsString() . "\n";
        $logMsg .= "=== UPLOAD END (ERROR) ===\n";
        if ($uploadVerbose && $logFile !== null) {
            file_put_contents($logFile, $logMsg, FILE_APPEND);
        }
        
        error_log("ERROR: " . $e->getMessage());
        error_log("Trace: " . $e->getTraceAsString());
        error_log("=== UPLOAD END (ERROR) ===");
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

