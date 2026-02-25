<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Logger.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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
$logger = new Logger();

// Extraire l'ID depuis l'URL
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Récupérer les métadonnées d'un document (LEFT JOIN : document de profil peut avoir appointment_id NULL)
    try {
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
            echo json_encode(['success' => false, 'error' => 'Document introuvable']);
            exit;
        }
        
        // Vérifier les permissions (document lié à un RDV ou document de profil)
        $hasAccess = false;
        if ($user['role'] === 'super_admin' || $document['uploaded_by'] === $user['user_id']) {
            $hasAccess = true;
        } elseif (!empty($document['appointment_id'])) {
            $hasAccess = (
                $document['apt_patient_id'] === $user['user_id'] ||
                $document['assigned_nurse_id'] === $user['user_id'] ||
                $document['assigned_lab_id'] === $user['user_id'] ||
                $document['apt_created_by'] === $user['user_id']
            );
        } else {
            $patStmt = $db->prepare('SELECT patient_id FROM patient_documents WHERE medical_document_id = ? LIMIT 1');
            $patStmt->execute([$id]);
            $pd = $patStmt->fetch(PDO::FETCH_ASSOC);
            if ($pd && $pd['patient_id'] === $user['user_id']) {
                $hasAccess = true;
            } elseif ($pd) {
                $createdStmt = $db->prepare('SELECT created_by FROM profiles WHERE id = ? LIMIT 1');
                $createdStmt->execute([$pd['patient_id']]);
                $prof = $createdStmt->fetch(PDO::FETCH_ASSOC);
                if ($prof && ($prof['created_by'] ?? '') === $user['user_id']) {
                    $hasAccess = true;
                }
            }
        }
        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        
        // Ne pas retourner le DEK
        unset($document['file_dek']);
        unset($document['apt_patient_id']);
        unset($document['assigned_to']);
        unset($document['assigned_nurse_id']);
        unset($document['assigned_lab_id']);
        unset($document['apt_created_by']);
        
        echo json_encode([
            'success' => true,
            'data' => $document,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Vérifier CSRF pour les requêtes modifiantes
    CSRFMiddleware::handle();

    // Supprimer un document (LEFT JOIN : document de profil peut avoir appointment_id NULL)
    try {
        $stmt = $db->prepare('
            SELECT md.*
            FROM medical_documents md
            WHERE md.id = ?
        ');
        $stmt->execute([$id]);
        $document = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$document) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Document introuvable']);
            exit;
        }
        
        // Seul l'auteur ou un admin peut supprimer (uploaded_by suffit pour document de profil ou RDV)
        $canDelete = (
            $document['uploaded_by'] === $user['user_id'] ||
            $user['role'] === 'super_admin'
        );
        
        if (!$canDelete) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accès refusé']);
            exit;
        }
        
        // Supprimer le fichier physique
        $filePath = __DIR__ . '/../../' . ltrim($document['file_path'], '/');
        if (file_exists($filePath)) {
            unlink($filePath);
            
            // Supprimer le dossier s'il est vide
            $dir = dirname($filePath);
            if (is_dir($dir) && count(scandir($dir)) === 2) {
                rmdir($dir);
            }
        }
        
        // Supprimer l'enregistrement en base
        $stmt = $db->prepare('DELETE FROM medical_documents WHERE id = ?');
        $stmt->execute([$id]);
        
        // Logger la suppression
        $logger->log(
            $user['user_id'],
            $user['role'],
            'delete',
            'medical_document',
            $id,
            ['file_name' => $document['file_name']]
        );
        
        echo json_encode([
            'success' => true,
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

