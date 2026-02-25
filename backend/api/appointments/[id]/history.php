<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin', 'lab', 'nurse']);

$pathParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$appointmentId = $pathParts[array_search('appointments', $pathParts) + 1] ?? null;

if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$sql = 'SELECT * FROM appointment_status_updates WHERE appointment_id = :id ORDER BY created_at DESC';
$stmt = $pdo->prepare($sql);
$stmt->execute([':id' => $appointmentId]);
$history = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => $history,
]);
