<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';

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
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'appointment_id requis']);
        exit;
    }
    
    try {
        // Vérifier les permissions (patient, professionnel assigné, ou admin)
        $stmt = $db->prepare('
            SELECT 
                patient_id,
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
        
        $hasAccess = (
            $appointment['patient_id'] === $user['user_id'] ||
            $appointment['assigned_nurse_id'] === $user['user_id'] ||
            $appointment['assigned_lab_id'] === $user['user_id'] ||
            (!empty($appointment['assigned_to']) && $appointment['assigned_to'] === $user['user_id']) ||
            $appointment['created_by'] === $user['user_id'] ||
            $user['role'] === 'super_admin'
        );
        // Lab / subaccount : accès si le RDV est assigné à quelqu'un de leur équipe
        if (!$hasAccess && in_array($user['role'], ['lab', 'subaccount'], true)) {
            $teamStmt = $db->prepare("SELECT id FROM profiles WHERE (id = ? OR lab_id = ?) AND role IN ('lab', 'subaccount', 'preleveur')");
            $teamStmt->execute([$user['user_id'], $user['user_id']]);
            $teamIds = array_column($teamStmt->fetchAll(PDO::FETCH_ASSOC), 'id');
            if (in_array($appointment['assigned_lab_id'], $teamIds, true) || (!empty($appointment['assigned_to']) && in_array($appointment['assigned_to'], $teamIds, true))) {
                $hasAccess = true;
            }
        }
        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        
        // Documents du RDV (appointment_id = ce RDV)
        $stmt = $db->prepare('
            SELECT 
                id,
                appointment_id,
                uploaded_by,
                file_name,
                file_size,
                mime_type,
                document_type,
                encrypted,
                created_at
            FROM medical_documents
            WHERE appointment_id = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$appointmentId]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($documents as &$d) {
            $d['source'] = 'appointment';
        }
        unset($d);
        
        // Documents du compte patient (profil patient, hors ce RDV) pour lab/subaccount/nurse/pro/admin
        $patientId = $appointment['patient_id'] ?? null;
        if ($patientId && in_array($user['role'], ['lab', 'subaccount', 'nurse', 'pro', 'super_admin'], true)) {
            $stmtPat = $db->prepare('
                SELECT 
                    md.id,
                    md.appointment_id,
                    md.uploaded_by,
                    md.file_name,
                    md.file_size,
                    md.mime_type,
                    md.document_type,
                    md.encrypted,
                    md.created_at
                FROM patient_documents pd
                JOIN medical_documents md ON pd.medical_document_id = md.id
                WHERE pd.patient_id = ?
                ORDER BY pd.document_type, md.created_at DESC
            ');
            $stmtPat->execute([$patientId]);
            $patientDocs = $stmtPat->fetchAll(PDO::FETCH_ASSOC);
            $appointmentDocIds = array_column($documents, 'id');
            foreach ($patientDocs as $pd) {
                if (!in_array($pd['id'], $appointmentDocIds, true)) {
                    $pd['source'] = 'patient_profile';
                    $documents[] = $pd;
                }
            }
        }
        
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
        
        $appointmentId = $_POST['appointment_id'] ?? null;
        $documentType = $_POST['document_type'] ?? null; // carte_vitale, carte_mutuelle, autres_assurances, ordonnance
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'HH','location'=>'medical-documents/index.php:148','message'=>'POST upload document','data'=>['appointment_id'=>$appointmentId,'document_type'=>$documentType,'has_file'=>isset($_FILES['file']),'post_keys'=>array_keys($_POST)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        if (!$appointmentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'appointment_id requis']);
            exit;
        }
        
        // Vérifier les permissions
        $stmt = $db->prepare('
            SELECT patient_id, assigned_to, assigned_nurse_id, assigned_lab_id
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
        
        $hasAccess = (
            $appointment['patient_id'] === $user['user_id'] ||
            $appointment['assigned_nurse_id'] === $user['user_id'] ||
            $appointment['assigned_lab_id'] === $user['user_id'] ||
            (!empty($appointment['assigned_to']) && $appointment['assigned_to'] === $user['user_id']) ||
            $user['role'] === 'super_admin'
        );
        
        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        
        // Validation du fichier
        $file = $_FILES['file'];
        $maxSize = 10 * 1024 * 1024; // 10MB
        $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 10MB)']);
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
        
        // Créer le dossier d'upload s'il n'existe pas
        // Les fichiers sont stockés dans uploads/medical/ à la racine du projet
        // __DIR__ est backend/api/medical-documents, donc on remonte jusqu'à la racine du projet
        $projectRoot = realpath(__DIR__ . '/../../../');
        if ($projectRoot === false) {
            $projectRoot = __DIR__ . '/../../../';
        }
        $uploadDir = $projectRoot . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Générer un ID unique pour le fichier
        $id = bin2hex(random_bytes(16));
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;
        
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
        
        // #region agent log - FIX: Verify file was written
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'FIX','location'=>'medical-documents/index.php:247','message'=>'File write result','data'=>['id'=>$id,'file_path'=>$filePath,'write_result'=>$writeResult,'file_exists_after'=>file_exists($filePath),'file_size_after'=>$writeResult!==false?filesize($filePath):null,'project_root'=>$projectRoot,'upload_dir'=>$uploadDir,'document_dir'=>$documentDir,'is_writable'=>is_writable($documentDir)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        if ($writeResult === false || !file_exists($filePath)) {
            throw new Exception('Erreur lors de l\'écriture du fichier sur le serveur. Vérifiez les permissions du dossier uploads/medical/');
        }
        
        // Stocker les métadonnées en base
        $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';
        
        $stmt = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'II','location'=>'medical-documents/index.php:249','message'=>'Inserting medical document','data'=>['id'=>$id,'appointment_id'=>$appointmentId,'uploaded_by'=>$user['user_id'],'file_name'=>$fileName,'document_type'=>$documentType],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        $stmt->execute([
            $id,
            $appointmentId,
            $user['user_id'],
            $fileName,
            $relativePath,
            $file['size'],
            $mimeType,
            $documentType ?: 'other', // Utiliser 'other' par défaut
            1, // Toujours chiffré
            $encryptedData['dek'],
        ]);
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'JJ','location'=>'medical-documents/index.php:260','message'=>'Medical document inserted successfully','data'=>['id'=>$id,'appointment_id'=>$appointmentId],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
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
        
        // Si c'est un document de profil (carte_vitale, carte_mutuelle, autres_assurances) 
        // ET que c'est le patient qui upload, sauvegarder aussi dans patient_documents
        $profileDocumentTypes = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];
        if ($documentType && in_array($documentType, $profileDocumentTypes, true) && 
            $appointment['patient_id'] === $user['user_id']) {
            
            try {
                // Vérifier si un document existe déjà pour ce type
                $checkStmt = $db->prepare('
                    SELECT id FROM patient_documents 
                    WHERE patient_id = ? AND document_type = ?
                ');
                $checkStmt->execute([$user['user_id'], $documentType]);
                $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingDoc) {
                    // Mettre à jour la référence vers le nouveau document
                    $updateStmt = $db->prepare('
                        UPDATE patient_documents 
                        SET medical_document_id = ?, updated_at = NOW()
                        WHERE id = ?
                    ');
                    $updateStmt->execute([$id, $existingDoc['id']]);
                } else {
                    // Créer une nouvelle entrée
                    $patientDocId = bin2hex(random_bytes(16));
                    $insertStmt = $db->prepare('
                        INSERT INTO patient_documents (
                            id, patient_id, document_type, medical_document_id, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, NOW(), NOW())
                    ');
                    $insertStmt->execute([
                        $patientDocId,
                        $user['user_id'],
                        $documentType,
                        $id
                    ]);
                }
            } catch (Exception $e) {
                // Logger l'erreur mais ne pas faire échouer l'upload
                error_log('Erreur lors de la sauvegarde dans patient_documents: ' . $e->getMessage());
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

