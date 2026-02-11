<?php

// Ne pas mettre header('Content-Type: application/json') ici car on va envoyer un fichier binaire
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Logger.php';

// CORS
$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Expose-Headers: Content-Disposition, Content-Type, Content-Length');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// #region agent log - HYPOTHESIS 2, 5: Check if download.php is reached and ID extraction
file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'H2_H5','location'=>'medical-documents/[id]/download.php:28','message'=>'Download endpoint reached','data'=>['request_uri'=>$_SERVER['REQUEST_URI']??null,'get_params'=>$_GET,'id_from_get'=>$_GET['id']??null,'file_exists'=>file_exists(__FILE__)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
// #endregion

$config = require __DIR__ . '/../../../config/database.php';
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

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

// #region agent log - HYPOTHESIS 2, 5: After ID extraction
file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'H2_H5','location'=>'medical-documents/[id]/download.php:45','message'=>'ID extracted','data'=>['id'=>$id,'id_is_null'=>$id===null],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
// #endregion

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

try {
    // Récupérer le document
    $stmt = $db->prepare('
        SELECT 
            md.*,
            a.patient_id,
            a.assigned_to,
            a.assigned_nurse_id,
            a.assigned_lab_id,
            a.created_by
        FROM medical_documents md
        JOIN appointments a ON md.appointment_id = a.id
        WHERE md.id = ?
    ');
    $stmt->execute([$id]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Document introuvable']);
        exit;
    }
    
    // Vérifier les permissions
    $hasAccess = (
        $document['patient_id'] === $user['user_id'] ||
        $document['assigned_nurse_id'] === $user['user_id'] ||
        $document['assigned_lab_id'] === $user['user_id'] ||
        $document['created_by'] === $user['user_id'] ||
        $document['uploaded_by'] === $user['user_id'] ||
        $user['role'] === 'super_admin'
    );
    
    if (!$hasAccess) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
    
    // Lire le fichier chiffré
    // Le chemin dans la base est /uploads/medical/... (relatif depuis la racine du projet)
    // Les fichiers sont stockés dans uploads/medical/ à la racine du projet
    // Le fichier est dans backend/api/medical-documents/[id]/download.php
    // On remonte jusqu'à la racine du projet puis on ajoute le chemin relatif
    // backend/api/medical-documents/[id] -> backend/api/medical-documents -> backend/api -> backend -> racine
    // Utiliser dirname() plusieurs fois pour éviter le problème avec [id] dans realpath()
    $currentDir = dirname(__FILE__); // backend/api/medical-documents/[id]
    $medicalDocsDir = dirname($currentDir); // backend/api/medical-documents
    $apiDir = dirname($medicalDocsDir); // backend/api
    $backendDir = dirname($apiDir); // backend
    $projectRoot = dirname($backendDir); // racine du projet
    
    // #region agent log - FIX: Log path resolution
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'FIX','location'=>'medical-documents/[id]/download.php:111','message'=>'Starting path resolution','data'=>['document_id'=>$id,'file_path_db'=>$document['file_path'],'current_dir'=>$currentDir,'project_root'=>$projectRoot,'backend_dir'=>$backendDir],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    // Le chemin dans la base peut être /uploads/medical/... ou uploads/medical/...
    $filePathFromDb = ltrim($document['file_path'], '/');
    $filePath = $projectRoot . '/' . $filePathFromDb;
    
    // Normaliser le chemin (résoudre les .. et .)
    $filePath = realpath($filePath);
    
    // #region agent log - FIX: After initial path resolution
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'FIX','location'=>'medical-documents/[id]/download.php:120','message'=>'After initial path resolution','data'=>['file_path_from_db'=>$filePathFromDb,'file_path'=>$filePath,'file_exists'=>$filePath!==false&&file_exists($filePath),'project_root'=>$projectRoot],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    // #region agent log - FIX: Check alternative paths
    if ($filePath === false || !file_exists($filePath)) {
        // Extraire le nom du fichier et le chemin relatif depuis file_path
        $pathParts = explode('/', trim($document['file_path'], '/'));
        $fileName = end($pathParts);
        
        // Essayer avec backend/uploads/medical/...
        $altPath1 = $backendDir . '/uploads/medical/' . $fileName;
        $altPath1 = realpath($altPath1);
        
        // Essayer avec uploads/ à la racine (structure complète)
        $altPath2 = $projectRoot . '/' . $filePathFromDb;
        $altPath2 = realpath($altPath2);
        
        // Essayer avec uploads/medical/ à la racine (juste le nom du fichier)
        $altPath3 = $projectRoot . '/uploads/medical/' . $fileName;
        $altPath3 = realpath($altPath3);
        
        // Essayer avec le chemin complet depuis backend
        $altPath4 = $backendDir . '/' . $filePathFromDb;
        $altPath4 = realpath($altPath4);
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'FIX','location'=>'medical-documents/[id]/download.php:120','message'=>'Trying alternative paths','data'=>['original_path'=>$filePath,'file_path_db'=>$document['file_path'],'file_path_from_db'=>$filePathFromDb,'alt_path1'=>$altPath1,'alt_path1_exists'=>$altPath1!==false&&file_exists($altPath1),'alt_path2'=>$altPath2,'alt_path2_exists'=>$altPath2!==false&&file_exists($altPath2),'alt_path3'=>$altPath3,'alt_path3_exists'=>$altPath3!==false&&file_exists($altPath3),'alt_path4'=>$altPath4,'alt_path4_exists'=>$altPath4!==false&&file_exists($altPath4),'project_root'=>$projectRoot,'backend_dir'=>$backendDir],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        // Utiliser le premier chemin alternatif qui existe
        if ($altPath1 !== false && file_exists($altPath1)) {
            $filePath = $altPath1;
        } elseif ($altPath2 !== false && file_exists($altPath2)) {
            $filePath = $altPath2;
        } elseif ($altPath3 !== false && file_exists($altPath3)) {
            $filePath = $altPath3;
        } elseif ($altPath4 !== false && file_exists($altPath4)) {
            $filePath = $altPath4;
        }
    }
    // #endregion
    
    // #region agent log
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'ZZ','location'=>'medical-documents/[id]/download.php:145','message'=>'Final file path resolution','data'=>['file_path_db'=>$document['file_path'],'file_path_resolved'=>$filePath,'file_exists'=>$filePath!==false&&file_exists($filePath),'project_root'=>$projectRoot],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    if ($filePath === false || !file_exists($filePath)) {
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'FIX','location'=>'medical-documents/[id]/download.php:150','message'=>'File not found after all attempts','data'=>['document_id'=>$id,'file_path_db'=>$document['file_path'],'file_path_resolved'=>$filePath,'project_root'=>$projectRoot],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false, 
            'error' => 'Fichier introuvable sur le serveur. Le document peut avoir été supprimé ou le chemin est incorrect.',
            'code' => 'FILE_NOT_FOUND'
        ]);
        exit;
    }
    
    // #region agent log
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'VV','location'=>'medical-documents/[id]/download.php:90','message'=>'Downloading medical document','data'=>['document_id'=>$id,'file_path_db'=>$document['file_path'],'file_path_resolved'=>$filePath,'file_exists'=>file_exists($filePath),'dirname'=>dirname($filePath),'dirname_exists'=>file_exists(dirname($filePath))],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    if (!file_exists($filePath)) {
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'WW','location'=>'medical-documents/[id]/download.php:95','message'=>'File not found','data'=>['document_id'=>$id,'file_path'=>$filePath,'document_file_path'=>$document['file_path'],'__DIR__'=>__DIR__],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Fichier introuvable sur le serveur']);
        exit;
    }
    
    $encryptedContent = file_get_contents($filePath);
    if ($encryptedContent === false) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la lecture du fichier']);
        exit;
    }
    
    // #region agent log
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'CCC','location'=>'medical-documents/[id]/download.php:134','message'=>'File read, preparing decryption','data'=>['document_id'=>$id,'file_size'=>strlen($encryptedContent),'has_file_dek'=>!empty($document['file_dek']),'mime_type'=>$document['mime_type']],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    // Déchiffrer le fichier
    // Le fichier est stocké en binaire sur le disque (après base64_decode lors de l'upload)
    // decryptFile attend le contenu chiffré en base64, donc on doit re-encoder en base64
    try {
        // Le fichier sur le disque est le payload binaire (iv + tag + ciphertext)
        // decryptFile attend ce payload en base64
        $decryptedContent = $crypto->decryptFile(
            base64_encode($encryptedContent),
            $document['file_dek']
        );
        
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'DDD','location'=>'medical-documents/[id]/download.php:145','message'=>'File decrypted successfully','data'=>['document_id'=>$id,'decrypted_size'=>strlen($decryptedContent),'mime_type'=>$document['mime_type']],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
    } catch (Exception $e) {
        // #region agent log
        file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'EEE','location'=>'medical-documents/[id]/download.php:150','message'=>'Decryption error','data'=>['document_id'=>$id,'error'=>$e->getMessage()],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
        // #endregion
        
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur lors du déchiffrement: ' . $e->getMessage()]);
        exit;
    }
    
    // Logger le téléchargement/déchiffrement
    $logger->logDecrypt(
        $user['user_id'],
        $user['role'],
        'medical_document',
        $id,
        ['file_name' => $document['file_name']]
    );
    
    // Vérifier que le contenu déchiffré est valide (pour les images JPEG, vérifier le magic number)
    if ($document['mime_type'] === 'image/jpeg' && strlen($decryptedContent) > 2) {
        $magicNumber = substr($decryptedContent, 0, 2);
        $expectedMagic = "\xFF\xD8"; // JPEG magic number
        if ($magicNumber !== $expectedMagic) {
            // #region agent log
            file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'III','location'=>'medical-documents/[id]/download.php:179','message'=>'Invalid JPEG magic number','data'=>['document_id'=>$id,'magic_number'=>bin2hex($magicNumber),'expected_magic'=>bin2hex($expectedMagic),'decrypted_size'=>strlen($decryptedContent)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
            // #endregion
            
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Fichier déchiffré invalide (magic number incorrect)']);
            exit;
        }
    }
    
    // #region agent log
    file_put_contents('/Users/alessandro/Documents/onev2/.cursor/debug.log', json_encode(['sessionId'=>'debug-session','runId'=>'run1','hypothesisId'=>'JJJ','location'=>'medical-documents/[id]/download.php:190','message'=>'Sending decrypted file','data'=>['document_id'=>$id,'file_name'=>$document['file_name'],'mime_type'=>$document['mime_type'],'content_length'=>strlen($decryptedContent),'first_bytes'=>bin2hex(substr($decryptedContent, 0, 10))],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND);
    // #endregion
    
    // Envoyer le fichier déchiffré
    header('Content-Type: ' . $document['mime_type']);
    header('Content-Disposition: attachment; filename="' . $document['file_name'] . '"');
    header('Content-Length: ' . strlen($decryptedContent));
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: no-cache');
    
    echo $decryptedContent;
    exit;
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'SERVER_ERROR',
    ]);
}




