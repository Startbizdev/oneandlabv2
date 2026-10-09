<?php


header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../lib/PatientDossierDocuments.php';
require_once __DIR__ . '/../../lib/ApiServerError.php';
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

// Patient : ses documents, ou ceux d'un proche (?relative_id ou ?user_id = dossier du proche) ;
// super_admin : documents d'un user via ?user_id=xxx ; pro/nurse/lab/subaccount : même périmètre que upload (created_by / lab / PPA)
$targetPatientId = $user['user_id'];
if ($user['role'] === 'patient') {
    $requestedUserId = isset($_GET['user_id']) ? trim((string) $_GET['user_id']) : '';
    if ($requestedUserId !== '') {
        $targetPatientId = $requestedUserId;
    }
} elseif ($user['role'] === 'super_admin') {
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

// Documents d'un proche : stockés sous (titulaire, relative_id), accessibles au titulaire et aux soignants du proche.
$documentsTarget = PatientDossierAccess::resolveProfileDocumentsTarget($db, $userModel, $user, $targetPatientId, $relativeId);
if ($documentsTarget === null) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => $relativeId !== null ? 'Proche introuvable ou accès refusé' : 'Accès refusé']);
    exit;
}
$targetPatientId = $documentsTarget['patient_id'];
$relativeId = $documentsTarget['relative_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $validDocuments = $relativeId !== null
            ? PatientDossierDocuments::listForRelative($db, $targetPatientId, $relativeId)
            : PatientDossierDocuments::listForPatient($db, $targetPatientId);

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
        ApiServerError::respond('documents patient ' . $targetPatientId . ' user=' . $user['user_id'], $e, 'Impossible de charger les documents. Réessayez plus tard.');
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

