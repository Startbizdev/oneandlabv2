<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../../config/database.php';
require_once __DIR__ . '/../../../../config/cors.php';
require_once __DIR__ . '/../../../../lib/AppointmentOfferSnooze.php';

$corsConfig = require __DIR__ . '/../../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['nurse', 'lab', 'subaccount', 'preleveur']);

CSRFMiddleware::handle();

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du rendez-vous requis']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}
$minutes = isset($input['minutes']) ? (int) $input['minutes'] : null;

$config = require __DIR__ . '/../../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

try {
    $aptStmt = $db->prepare('SELECT id, type, status FROM appointments WHERE id = ? LIMIT 1');
    $aptStmt->execute([$appointmentId]);
    $apt = $aptStmt->fetch(PDO::FETCH_ASSOC);
    if (!$apt || ($apt['status'] ?? '') !== 'pending') {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable ou plus en attente']);
        exit;
    }

    $role = (string) ($user['role'] ?? '');
    $type = (string) ($apt['type'] ?? '');
    if ($role === 'nurse' && $type !== 'nursing') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Offre non applicable']);
        exit;
    }
    if (in_array($role, ['lab', 'subaccount', 'preleveur'], true) && $type !== 'blood_test') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Offre non applicable']);
        exit;
    }

    $result = AppointmentOfferSnooze::snoozeOffer(
        $db,
        (string) $appointmentId,
        (string) $user['user_id'],
        $minutes
    );

    echo json_encode([
        'success' => true,
        'data' => $result,
    ]);
} catch (InvalidArgumentException $e) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
