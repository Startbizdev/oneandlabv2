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
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier CSRF pour les requêtes modifiantes
CSRFMiddleware::handle();

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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        $sourceMedicalDocumentId = $input['source_medical_document_id'] ?? null;
        $appointmentId = $input['appointment_id'] ?? null;
        $documentType = $input['document_type'] ?? null;
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'SS','location'=>'medical-documents/copy.php:48','message'=>'Copy medical document request','data'=>['source_medical_document_id'=>$sourceMedicalDocumentId,'appointment_id'=>$appointmentId,'document_type'=>$documentType],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        if (!$sourceMedicalDocumentId || !$appointmentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'source_medical_document_id et appointment_id requis']);
            exit;
        }
        
        // Vérifier que le document source existe et que l'utilisateur y a accès
        $stmt = $db->prepare('
            SELECT 
                md.id,
                md.file_name,
                md.file_path,
                md.file_size,
                md.mime_type,
                md.document_type,
                md.file_dek,
                md.appointment_id,
                a.patient_id
            FROM medical_documents md
            LEFT JOIN appointments a ON md.appointment_id = a.id
            WHERE md.id = ?
        ');
        $stmt->execute([$sourceMedicalDocumentId]);
        $sourceDoc = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$sourceDoc) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Document source introuvable']);
            exit;
        }
        
        // Vérifier les permissions (le patient doit être le propriétaire du document source)
        if ($sourceDoc['patient_id'] !== $user['user_id'] && $user['role'] !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé au document source']);
            exit;
        }
        
        // Vérifier que le nouveau rendez-vous existe et appartient au même patient
        $stmt = $db->prepare('SELECT patient_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
            exit;
        }
        
        if ($appointment['patient_id'] !== $user['user_id'] && $user['role'] !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé au rendez-vous']);
            exit;
        }
        
        // Lire le fichier source
        // Les fichiers sont stockés dans uploads/medical/ à la racine du projet
        // __DIR__ est backend/api/medical-documents, donc on remonte jusqu'à la racine du projet
        $projectRoot = realpath(__DIR__ . '/../../../../');
        if ($projectRoot === false) {
            $projectRoot = __DIR__ . '/../../../../';
        }
        $sourceFilePath = $projectRoot . '/' . ltrim($sourceDoc['file_path'], '/');
        $sourceFilePath = realpath($sourceFilePath);
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'AAA','location'=>'medical-documents/copy.php:114','message'=>'Reading source file','data'=>['source_file_path_db'=>$sourceDoc['file_path'],'source_base_path'=>$sourceBasePath,'source_file_path_resolved'=>$sourceFilePath,'source_exists'=>$sourceFilePath!==false&&file_exists($sourceFilePath),'__DIR__'=>__DIR__],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        if (!file_exists($sourceFilePath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Fichier source introuvable']);
            exit;
        }
        
        $fileContent = file_get_contents($sourceFilePath);
        if ($fileContent === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la lecture du fichier source']);
            exit;
        }
        
        // Créer un nouveau dossier pour le document copié
        // Les fichiers sont stockés dans uploads/medical/ à la racine du projet
        // __DIR__ est backend/api/medical-documents, donc on remonte jusqu'à la racine du projet
        // backend/api/medical-documents -> backend/api -> backend -> racine
        $projectRoot = realpath(__DIR__ . '/../../../../');
        if ($projectRoot === false) {
            $projectRoot = __DIR__ . '/../../../../';
        }
        $uploadDir = $projectRoot . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'BBB','location'=>'medical-documents/copy.php:129','message'=>'Setting up upload directory','data'=>['project_root'=>$projectRoot,'upload_dir'=>$uploadDir,'upload_dir_exists'=>is_dir($uploadDir),'__DIR__'=>__DIR__],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        // Générer un ID unique pour le nouveau document
        $newId = bin2hex(random_bytes(16));
        $fileExtension = pathinfo($sourceDoc['file_name'], PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($sourceDoc['file_name'], PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;
        
        // Créer le dossier pour ce document
        $documentDir = $uploadDir . $newId . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        
        // Copier le fichier chiffré (on garde le même chiffrement)
        $newFilePath = $documentDir . $fileName . '.encrypted';
        $copyResult = file_put_contents($newFilePath, $fileContent);
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'XX','location'=>'medical-documents/copy.php:147','message'=>'Copying file','data'=>['source_file'=>$sourceFilePath,'source_exists'=>file_exists($sourceFilePath),'dest_file'=>$newFilePath,'dest_dir'=>$documentDir,'dest_dir_exists'=>is_dir($documentDir),'copy_result'=>$copyResult,'file_size'=>strlen($fileContent),'upload_dir'=>$uploadDir],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        if ($copyResult === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la copie du fichier']);
            exit;
        }
        
        // Stocker les métadonnées en base avec le nouvel appointment_id
        // Le chemin relatif doit correspondre à celui utilisé dans index.php
        // Dans index.php: '/uploads/medical/' . $id . '/' . $fileName . '.encrypted'
        // Mais le fichier réel est dans backend/uploads/medical/...
        // Donc le chemin relatif depuis la racine du projet devrait être backend/uploads/medical/...
        // Mais dans la base, on stocke /uploads/medical/... donc download.php doit résoudre depuis backend/
        $relativePath = '/uploads/medical/' . $newId . '/' . $fileName . '.encrypted';
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'YY','location'=>'medical-documents/copy.php:160','message'=>'File copied, storing metadata','data'=>['new_id'=>$newId,'relative_path'=>$relativePath,'full_path'=>$newFilePath,'file_exists'=>file_exists($newFilePath)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        $stmt = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        
        $stmt->execute([
            $newId,
            $appointmentId,
            $user['user_id'],
            $fileName,
            $relativePath,
            $sourceDoc['file_size'],
            $sourceDoc['mime_type'],
            $documentType ?: $sourceDoc['document_type'] ?: 'other',
            1, // Toujours chiffré
            $sourceDoc['file_dek'], // Utiliser la même clé de déchiffrement
        ]);
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'TT','location'=>'medical-documents/copy.php:150','message'=>'Medical document copied successfully','data'=>['new_id'=>$newId,'appointment_id'=>$appointmentId,'source_id'=>$sourceMedicalDocumentId],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        // Logger la copie
        $logger->log(
            $user['user_id'],
            $user['role'],
            'create',
            'medical_document',
            $newId,
            [
                'appointment_id' => $appointmentId,
                'source_medical_document_id' => $sourceMedicalDocumentId,
                'file_name' => $fileName,
                'action' => 'copy',
            ]
        );
        
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $newId,
                'file_name' => $fileName,
                'file_size' => $sourceDoc['file_size'],
                'mime_type' => $sourceDoc['mime_type'],
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

