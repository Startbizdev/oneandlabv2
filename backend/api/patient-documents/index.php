<?php


header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
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

// Seuls les patients peuvent accéder à leurs documents
if ($user['role'] !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Vérifier d'abord combien de documents existent pour ce patient
        $countStmt = $db->prepare('SELECT COUNT(*) as count FROM patient_documents WHERE patient_id = ?');
        $countStmt->execute([$user['user_id']]);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Récupérer les documents du profil patient
        // Utiliser LEFT JOIN pour éviter de perdre des documents si la jointure échoue
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
        $stmt->execute([$user['user_id']]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
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
            $user['user_id'],
            [
                'count' => count($validDocuments),
                'total_found' => count($documents),
                'total_in_db' => $totalCount,
                'patient_id' => $user['user_id'],
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
            'patient_id' => $user['user_id']
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

