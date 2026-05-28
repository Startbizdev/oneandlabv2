<?php


header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../lib/PatientDossierDocuments.php';
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

// Staff / préleveur : même périmètre que patient-history (créateur, PPA, RDV assigné…)
if ($user['role'] !== 'patient' && $user['role'] !== 'super_admin') {
    if (!PatientDossierAccess::canAccess($db, $userModel, $user, $targetPatientId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        if ($relativeId && $user['role'] === 'patient') {
            $checkRel = $db->prepare('SELECT id FROM patient_relatives WHERE id = ? AND patient_id = ?');
            $checkRel->execute([$relativeId, $user['user_id']]);
            if (!$checkRel->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Proche introuvable ou accès refusé']);
                exit;
            }
            $validDocuments = PatientDossierDocuments::listForRelative($db, $user['user_id'], $relativeId);
        } else {
            $validDocuments = PatientDossierDocuments::listForPatient($db, $targetPatientId);
        }

        $logger->log(
            $user['user_id'],
            $user['role'],
            'view',
            'patient_documents',
            $targetPatientId,
            [
                'count' => count($validDocuments),
                'patient_id' => $targetPatientId,
                'relative_id' => $relativeId,
                'document_types' => array_column($validDocuments, 'document_type'),
            ]
        );

        echo json_encode([
            'success' => true,
            'data' => array_values($validDocuments),
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

