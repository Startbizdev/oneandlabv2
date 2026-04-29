<?php


header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../models/User.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentification
$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

// Patient : ses documents ; super_admin : documents d'un user via ?user_id=xxx ; pro/nurse/lab/subaccount : même périmètre que upload (created_by / lab / PPA)
$targetPatientId = $user['user_id'];
if ($user['role'] === 'super_admin') {
    $requestedUserId = isset($_GET['user_id']) ? trim($_GET['user_id']) : null;
    if ($requestedUserId !== null && $requestedUserId !== '') {
        $targetPatientId = $requestedUserId;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paramètre user_id requis pour l\'admin']);
        exit;
    }
} elseif (in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'], true)) {
    $requestedUserId = isset($_GET['user_id']) ? trim($_GET['user_id']) : null;
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

// Patient : optionnellement ?relative_id=xxx pour les documents d'un proche
$relativeId = isset($_GET['relative_id']) ? trim($_GET['relative_id']) : null;
if ($relativeId !== null && $relativeId === '') {
    $relativeId = null;
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
$logger = new Logger();
$userModel = new User();

// Pro / nurse / lab / sous-compte : même périmètre que patient-documents/upload.php
if (in_array($user['role'], ['pro', 'nurse', 'lab', 'subaccount'], true)) {
    $checkStmt = $db->prepare('SELECT id, role, created_by FROM profiles WHERE id = ? LIMIT 1');
    $checkStmt->execute([$targetPatientId]);
    $profile = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if (!$profile || ($profile['role'] ?? '') !== 'patient') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
    $cb = (string) ($profile['created_by'] ?? '');
    $ok = false;
    if (in_array($user['role'], ['pro', 'nurse', 'subaccount'], true)) {
        $ok = ($cb === $user['user_id']);
    } elseif ($user['role'] === 'lab') {
        if ($cb === $user['user_id']) {
            $ok = true;
        } else {
            $creatorLabId = $userModel->getLabId($cb);
            $ok = ($creatorLabId === $user['user_id']);
        }
    }
    if (!$ok && $userModel->hasProfessionalAccessToPatient($user['user_id'], $targetPatientId)) {
        $ok = true;
    }
    if (!$ok) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
}

if ($user['role'] === 'preleveur') {
    $checkStmt = $db->prepare('SELECT 1 FROM appointments WHERE patient_id = ? AND type = ? AND assigned_to = ? LIMIT 1');
    $checkStmt->execute([$targetPatientId, 'blood_test', $user['user_id']]);
    if (!$checkStmt->fetchColumn()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $documents = [];
        $totalCount = 0;

        if ($relativeId && $user['role'] === 'patient') {
            // Documents d'un proche : vérifier que le proche appartient au patient
            $checkRel = $db->prepare('SELECT id FROM patient_relatives WHERE id = ? AND patient_id = ?');
            $checkRel->execute([$relativeId, $user['user_id']]);
            if (!$checkRel->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Proche introuvable ou accès refusé']);
                exit;
            }
            // Vérifier si la table patient_relative_documents existe
            $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
            if ($tableExists) {
                $countStmt = $db->prepare('SELECT COUNT(*) as count FROM patient_relative_documents WHERE patient_id = ? AND relative_id = ?');
                $countStmt->execute([$user['user_id'], $relativeId]);
                $totalCount = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
                $stmt = $db->prepare('
                    SELECT 
                        prd.id,
                        prd.document_type,
                        prd.created_at,
                        prd.updated_at,
                        prd.medical_document_id as pd_medical_document_id,
                        md.id as medical_document_id,
                        md.file_name,
                        md.file_size,
                        md.mime_type,
                        md.created_at as uploaded_at
                    FROM patient_relative_documents prd
                    LEFT JOIN medical_documents md ON prd.medical_document_id = md.id
                    WHERE prd.patient_id = ? AND prd.relative_id = ?
                    ORDER BY prd.document_type
                ');
                $stmt->execute([$user['user_id'], $relativeId]);
                $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } else {
            // Documents du patient (pour moi-même)
            $countStmt = $db->prepare('SELECT COUNT(*) as count FROM patient_documents WHERE patient_id = ?');
            $countStmt->execute([$targetPatientId]);
            $totalCount = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
            $stmt = $db->prepare('
                SELECT 
                    pd.id,
                    pd.document_type,
                    pd.created_at,
                    pd.updated_at,
                    pd.medical_document_id as pd_medical_document_id,
                    md.id as medical_document_id,
                    md.file_name,
                    md.file_size,
                    md.mime_type,
                    md.created_at as uploaded_at
                FROM patient_documents pd
                LEFT JOIN medical_documents md ON pd.medical_document_id = md.id
                WHERE pd.patient_id = ?
                ORDER BY pd.document_type
            ');
            $stmt->execute([$targetPatientId]);
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Filtrer les documents qui ont bien un medical_document associé
        $validDocuments = array_filter($documents, function($doc) {
            return !empty($doc['medical_document_id']);
        });
        
        // Identifier les documents sans medical_document associé
        $documentsWithoutMd = array_filter($documents, function($doc) {
            return !empty($doc['pd_medical_document_id']) && empty($doc['medical_document_id']);
        });
        
        // Logger l'accès avec plus de détails pour le débogage
        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'patient_documents',
            $targetPatientId,
            [
                'count' => count($validDocuments),
                'total_found' => count($documents),
                'total_in_db' => $totalCount,
                'patient_id' => $targetPatientId,
                'document_types' => array_column($documents, 'document_type'),
                'has_medical_docs' => array_column($documents, 'medical_document_id'),
                'documents_without_md' => count($documentsWithoutMd)
            ]
        );
        
        // Toujours retourner un tableau, même vide
        $result = [
            'success' => true,
            'data' => array_values($validDocuments),
        ];
        
        // Ajouter des infos de debug pour aider au diagnostic
        $result['debug'] = [
            'total_patient_documents' => count($documents),
            'total_in_database' => $totalCount,
            'valid_documents' => count($validDocuments),
            'filtered_out' => count($documents) - count($validDocuments),
            'documents_without_medical_doc' => count($documentsWithoutMd),
            'patient_id' => $targetPatientId,
            'relative_id' => $relativeId,
        ];
        
        // Si des documents existent mais n'ont pas de medical_document associé, ajouter un avertissement
        if (count($documentsWithoutMd) > 0) {
            $result['debug']['warning'] = 'Certains documents dans patient_documents n\'ont pas de medical_document associé';
            $result['debug']['problematic_documents'] = array_map(function($doc) {
                return [
                    'id' => $doc['id'],
                    'document_type' => $doc['document_type'],
                    'pd_medical_document_id' => $doc['pd_medical_document_id']
                ];
            }, $documentsWithoutMd);
        }
        
        echo json_encode($result);
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

