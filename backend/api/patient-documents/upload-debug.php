<?php
/**
 * Version de debug de upload.php qui log tout
 */

// Log de démarrage
error_log("=== UPLOAD DEBUG START ===");
error_log("REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A'));
error_log("HTTP_ORIGIN: " . ($_SERVER['HTTP_ORIGIN'] ?? 'N/A'));

// Les variables d'environnement sont chargées par index.php
error_log("ENV loaded: BACKEND_KEK_HEX=" . (isset($_ENV['BACKEND_KEK_HEX']) ? 'SET' : 'NOT SET'));

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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log("OPTIONS request - exiting");
    http_response_code(200);
    exit;
}

// Authentification
error_log("Checking auth...");
try {
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();
    error_log("Auth OK - User: " . $user['user_id'] . " Role: " . $user['role']);
} catch (Exception $e) {
    error_log("Auth FAILED: " . $e->getMessage());
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication failed: ' . $e->getMessage()]);
    exit;
}

// Vérifier CSRF
error_log("Checking CSRF...");
try {
    CSRFMiddleware::handle();
    error_log("CSRF OK");
} catch (Exception $e) {
    error_log("CSRF FAILED: " . $e->getMessage());
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'CSRF failed: ' . $e->getMessage()]);
    exit;
}

// Seuls les patients peuvent uploader leurs documents
if ($user['role'] !== 'patient') {
    error_log("Role check FAILED: " . $user['role']);
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

error_log("Checking FILES...");
error_log("FILES: " . json_encode($_FILES));
error_log("POST: " . json_encode($_POST));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!isset($_FILES['file'])) {
            throw new Exception('$_FILES[file] not set');
        }
        
        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Upload error code: ' . $_FILES['file']['error']);
        }
        
        error_log("File upload OK - Size: " . $_FILES['file']['size']);
        
        // Continue avec le code normal...
        echo json_encode([
            'success' => true,
            'debug' => [
                'user_id' => $user['user_id'],
                'file_name' => $_FILES['file']['name'],
                'file_size' => $_FILES['file']['size'],
                'document_type' => $_POST['document_type'] ?? 'N/A',
                'env_loaded' => isset($_ENV['BACKEND_KEK_HEX']),
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
} else {
    error_log("Wrong method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}

error_log("=== UPLOAD DEBUG END ===");




