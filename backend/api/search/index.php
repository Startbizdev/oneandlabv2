<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/StaffPatientHubSearch.php';

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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (!in_array($user['role'] ?? '', ['nurse', 'pro'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$query = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;

try {
    $config = require __DIR__ . '/../../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    $search = new StaffPatientHubSearch($db);
    $result = $search->search($user, $query, $limit);

    echo json_encode([
        'success' => true,
        'data' => $result,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur lors de la recherche',
    ]);
}
