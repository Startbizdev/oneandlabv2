<?php

// Ne pas mettre header('Content-Type: application/json') ici car on va envoyer un fichier binaire
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/MedicalDocumentAccess.php';

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

// Extraire l'ID depuis l'URL (injecté par le routeur dans $_GET, ou fallback depuis REQUEST_URI)
$id = $_GET['id'] ?? null;
if ($id === null || $id === '') {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/medical-documents/([a-f0-9-]{36})/download#i', $uri, $m)) {
        $id = $m[1];
    }
}

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

try {
    // Récupérer le document (LEFT JOIN : document de profil peut avoir appointment_id NULL)
    $stmt = $db->prepare('
        SELECT 
            md.*,
            a.patient_id AS apt_patient_id,
            a.assigned_to,
            a.assigned_nurse_id,
            a.assigned_lab_id,
            a.created_by AS apt_created_by
        FROM medical_documents md
        LEFT JOIN appointments a ON md.appointment_id = a.id
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
    $hasAccess = MedicalDocumentAccess::userCanAccess($db, $user, $document);
    
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

    // Le chemin dans la base peut être /uploads/medical/... ou uploads/medical/...
    $filePathFromDb = ltrim($document['file_path'], '/');
    $filePath = $projectRoot . '/' . $filePathFromDb;
    
    // Normaliser le chemin (résoudre les .. et .)
    $filePath = realpath($filePath);

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

    if ($filePath === false || !file_exists($filePath)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false, 
            'error' => 'Fichier introuvable sur le serveur. Le document peut avoir été supprimé ou le chemin est incorrect.',
            'code' => 'FILE_NOT_FOUND'
        ]);
        exit;
    }

    if (!file_exists($filePath)) {
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
    } catch (Exception $e) {
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
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Fichier déchiffré invalide (magic number incorrect)']);
            exit;
        }
    }

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




