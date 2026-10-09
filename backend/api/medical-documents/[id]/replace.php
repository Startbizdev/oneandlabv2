<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/ApiServerError.php';
require_once __DIR__ . '/../../../lib/medical-documents/MedicalDocumentReplacement.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
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

$user = (new AuthMiddleware())->handle();
CSRFMiddleware::handle();

$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '' && preg_match('#/medical-documents/([a-f0-9-]{32,36})/replace#i', $_SERVER['REQUEST_URI'] ?? '', $m)) {
    $id = $m[1];
}
if ($id === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'],
);

try {
    $payload = (new MedicalDocumentReplacement($db, new Crypto(), new Logger($db)))
        ->replace($user, $id, $_FILES['file'] ?? null);
    echo json_encode(['success' => true, 'data' => $payload]);
} catch (HttpStatusException $e) {
    http_response_code($e->httpStatus);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'code' => $e->errorCode]);
} catch (Throwable $e) {
    ApiServerError::respond('remplacement ordonnance ' . $id . ' user=' . $user['user_id'], $e, 'Le remplacement de l’ordonnance a échoué. Réessayez plus tard.');
}
