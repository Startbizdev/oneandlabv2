<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/stripe.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../models/User.php';

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
$role = $authUser['role'];
$body = json_decode(file_get_contents('php://input'), true) ?: [];
$planSlug = trim((string)($body['plan_slug'] ?? ''));
$priceId = trim((string)($body['price_id'] ?? ''));
$successUrl = trim((string)($body['success_url'] ?? ''));
$cancelUrl = trim((string)($body['cancel_url'] ?? ''));

if ($planSlug === '' && $priceId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'plan_slug ou price_id requis']);
    exit;
}

$stripeConfig = require __DIR__ . '/../../config/stripe.php';
if (empty($stripeConfig['secret_key'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Stripe non configuré']);
    exit;
}

if ($priceId === '' && $planSlug !== '') {
    $allowed = $role === 'nurse' ? ['nurse_pro'] : ['lab_starter', 'lab_pro'];
    if (!in_array($planSlug, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Plan non autorisé pour ce rôle']);
        exit;
    }
    $priceId = $stripeConfig['prices'][$planSlug] ?? '';
    if ($priceId === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Price ID non configuré pour ce plan']);
        exit;
    }
}

if ($successUrl === '' || $cancelUrl === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'success_url et cancel_url requis']);
    exit;
}

require_once __DIR__ . '/../../vendor/autoload.php';
\Stripe\Stripe::setApiKey($stripeConfig['secret_key']);

$config = require __DIR__ . '/../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stripeCustomerId = null;
$stmt = $pdo->prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1');
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($row && !empty($row['stripe_customer_id'])) {
    $stripeCustomerId = $row['stripe_customer_id'];
}

$userModel = new User();
$user = $userModel->getById($userId, $userId, $role);
$customerEmail = $user['email'] ?? null;

$sessionParams = [
    'mode' => 'subscription',
    'payment_method_types' => ['card'],
    'line_items' => [
        [
            'price' => $priceId,
            'quantity' => 1,
        ],
    ],
    'subscription_data' => [
        'trial_period_days' => 30,
        'metadata' => [
            'user_id' => $userId,
            'plan_slug' => $planSlug ?: 'unknown',
        ],
    ],
    'success_url' => $successUrl,
    'cancel_url' => $cancelUrl,
    'metadata' => [
        'user_id' => $userId,
        'role' => $role,
        'plan_slug' => $planSlug ?: 'unknown',
    ],
];

if ($stripeCustomerId) {
    $sessionParams['customer'] = $stripeCustomerId;
} elseif ($customerEmail) {
    $sessionParams['customer_email'] = $customerEmail;
}

try {
    $session = \Stripe\Checkout\Session::create($sessionParams);
    echo json_encode(['success' => true, 'url' => $session->url]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
