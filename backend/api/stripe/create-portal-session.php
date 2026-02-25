<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/stripe.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';

$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0 || strpos($origin, 'http://127.0.0.1:') === 0) {
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

try {
    $authMiddleware = new AuthMiddleware();
    $authUser = $authMiddleware->handle();
    $roleMiddleware = new RoleMiddleware();
    $roleMiddleware->handle($authUser, ['nurse', 'lab']);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$userId = $authUser['user_id'];
$body = json_decode(file_get_contents('php://input'), true) ?: [];
$returnUrl = trim((string)($body['return_url'] ?? ''));

if ($returnUrl === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'return_url requis']);
    exit;
}

$stripeConfig = require __DIR__ . '/../../config/stripe.php';
if (empty($stripeConfig['secret_key'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Stripe non configuré']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $pdo->prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$stripeCustomerId = $row['stripe_customer_id'] ?? null;

if (!$stripeCustomerId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Aucun abonnement Stripe associé à ce compte']);
    exit;
}

require_once __DIR__ . '/../../vendor/autoload.php';
\Stripe\Stripe::setApiKey($stripeConfig['secret_key']);

try {
    $session = \Stripe\BillingPortal\Session::create([
        'customer' => $stripeCustomerId,
        'return_url' => $returnUrl,
    ]);
    echo json_encode(['success' => true, 'url' => $session->url]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
