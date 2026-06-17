<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0 || strpos($origin, 'http://127.0.0.1:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
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
if (($user['role'] ?? '') !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux patients']);
    exit;
}

$sessionId = trim((string) ($_GET['session_id'] ?? ''));
$draftId = trim((string) ($_GET['draft_id'] ?? ''));
if ($sessionId === '' && $draftId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'session_id ou draft_id requis']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

if ($draftId !== '') {
    $stmt = $db->prepare('SELECT * FROM patient_booking_drafts WHERE id = ? AND user_id = ? LIMIT 1');
    $stmt->execute([$draftId, $user['user_id']]);
} else {
    $stmt = $db->prepare('SELECT * FROM patient_booking_drafts WHERE stripe_checkout_session_id = ? AND user_id = ? LIMIT 1');
    $stmt->execute([$sessionId, $user['user_id']]);
}
$draft = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$draft) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Paiement introuvable']);
    exit;
}

$status = (string) ($draft['status'] ?? '');
$data = ['status' => $status];

if ($status === 'completed' && !empty($draft['created_appointment_ids_json'])) {
    $ids = json_decode((string) $draft['created_appointment_ids_json'], true);
    $data['appointment_ids'] = is_array($ids) ? array_values(array_map('strval', $ids)) : [];
}
if (($status === 'failed' || $status === 'expired') && !empty($draft['error_message'])) {
    $data['error_message'] = (string) $draft['error_message'];
}

echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
