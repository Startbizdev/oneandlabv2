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
        
        // Rendez-vous cible (inclure relative_id)
        $stmt = $db->prepare('SELECT patient_id, relative_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$appointment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
            exit;
        }
        
        $appointmentPatientId = $appointment['patient_id'];
        $appointmentRelativeId = $appointment['relative_id'] ?? null;
        $sourceDocumentPatientId = $sourceDoc['patient_id']; // NULL si document de profil (appointment_id NULL)
        $sourceDocumentRelativeId = null;
        
        // Document de profil : récupérer patient_id via patient_documents ou patient_relative_documents
        if ($sourceDocumentPatientId === null) {
            $pdStmt = $db->prepare('SELECT patient_id FROM patient_documents WHERE medical_document_id = ? LIMIT 1');
            $pdStmt->execute([$sourceMedicalDocumentId]);
            $pd = $pdStmt->fetch(PDO::FETCH_ASSOC);
            if ($pd) {
                $sourceDocumentPatientId = $pd['patient_id'];
            } else {
                $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
                if ($tableExists) {
                    $prdStmt = $db->prepare('SELECT patient_id, relative_id FROM patient_relative_documents WHERE medical_document_id = ? LIMIT 1');
                    $prdStmt->execute([$sourceMedicalDocumentId]);
                    $prd = $prdStmt->fetch(PDO::FETCH_ASSOC);
                    if ($prd) {
                        $sourceDocumentPatientId = $prd['patient_id'];
                        $sourceDocumentRelativeId = $prd['relative_id'];
                    }
                }
            }
        }
        
        $allowed = false;
        if ($user['role'] === 'super_admin') {
            $allowed = true;
        } elseif ($user['role'] === 'patient') {
            $allowed = ($sourceDocumentPatientId === $user['user_id'] && $appointmentPatientId === $user['user_id']);
            if ($allowed && $sourceDocumentRelativeId !== null && $appointmentRelativeId !== null) {
                $allowed = ($sourceDocumentRelativeId === $appointmentRelativeId);
            } elseif ($allowed && ($sourceDocumentRelativeId !== null || $appointmentRelativeId !== null)) {
                $allowed = ($sourceDocumentRelativeId === $appointmentRelativeId);
            }
        } elseif ($user['role'] === 'pro') {
            // Pro : document doit appartenir au patient du RDV et le patient doit avoir été créé par ce pro
            if ($sourceDocumentPatientId && $sourceDocumentPatientId === $appointmentPatientId) {
                $profStmt = $db->prepare('SELECT created_by FROM profiles WHERE id = ? AND role = ? LIMIT 1');
                $profStmt->execute([$appointmentPatientId, 'patient']);
                $prof = $profStmt->fetch(PDO::FETCH_ASSOC);
                $allowed = $prof && ($prof['created_by'] === $user['user_id']);
            }
        }
        
        if (!$allowed) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé au document source ou au rendez-vous']);
            exit;
        }
        
        if ($sourceDocumentPatientId !== $appointmentPatientId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Le document ne concerne pas le patient de ce rendez-vous']);
            exit;
        }
        if ($appointmentRelativeId && $sourceDocumentRelativeId !== $appointmentRelativeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Le document ne concerne pas le proche de ce rendez-vous']);
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

