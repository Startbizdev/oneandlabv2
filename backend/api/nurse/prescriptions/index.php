<?php

/**
 * Liste des ordonnances / prescriptions d'actes de l'infirmier connecté.
 * GET — rôle : nurse. Query : page, limit, patient_id
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/PrescriptionService.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (($user['role'] ?? '') !== 'nurse') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux infirmiers']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = (int) ($_GET['limit'] ?? 20);
$patientId = isset($_GET['patient_id']) ? trim((string) $_GET['patient_id']) : null;
if ($patientId === '') {
    $patientId = null;
}

try {
    $result = PrescriptionService::listPrescriptions(
        $db,
        $crypto,
        $user['user_id'],
        'nurse',
        $page,
        $limit,
        $patientId
    );

    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'pagination' => $result['pagination'],
    ]);
} catch (Throwable $e) {
    error_log('nurse/prescriptions: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
