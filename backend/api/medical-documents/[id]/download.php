<?php

// Ne pas mettre header('Content-Type: application/json') ici car on va envoyer un fichier binaire
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/MedicalDocumentAccess.php';
require_once __DIR__ . '/../../../lib/MedicalDocumentsInternal.php';

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
    $document = MedicalDocumentAccess::loadForAccess($db, (string) $id);
    
    if (!$document) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Document introuvable']);
        exit;
    }
    
    // Vérifier les permissions
    $hasAccess = MedicalDocumentAccess::userCanRead($db, $user, $document);
    
    if (!$hasAccess) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
    
    // Fichier chiffré (disque ou S3 selon MEDICAL_FILES_DRIVER)
    $encryptedContent = MedicalDocumentsInternal::readStoredFile((string) $document['file_path']);
    if ($encryptedContent === null) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Fichier introuvable sur le serveur. Le document peut avoir été supprimé ou le chemin est incorrect.',
            'code' => 'FILE_NOT_FOUND'
        ]);
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
        error_log('medical-document decrypt failed: ' . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Erreur lors du déchiffrement']);
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
    $downloadName = str_replace(["\r", "\n", '"', '\\'], '_', basename((string) $document['file_name']));
    if ($downloadName === '' || $downloadName === '.' || $downloadName === '..') {
        $downloadName = 'document';
    }
    header(
        'Content-Disposition: attachment; filename="' . $downloadName
        . '"; filename*=UTF-8\'\'' . rawurlencode($downloadName)
    );
    header('Content-Length: ' . strlen($decryptedContent));
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: no-cache');
    
    echo $decryptedContent;
    exit;
    
} catch (Exception $e) {
    error_log('medical-document download failed: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Erreur interne du serveur',
        'code' => 'SERVER_ERROR',
    ]);
}




