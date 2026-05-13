<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../lib/Validation.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/PatientUrgencyConfig.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
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

CSRFMiddleware::handle();

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
if (($user['role'] ?? '') !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux patients']);
    exit;
}
$uid = $user['user_id'];

$body = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($body)) {
    $body = [];
}
$draftId = trim((string) ($body['draft_id'] ?? ''));
if ($draftId === '' || !Validation::uuid($draftId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'draft_id invalide']);
    exit;
}

$stripeConfig = require __DIR__ . '/../../../config/stripe.php';
if (empty($stripeConfig['secret_key'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Stripe non configuré']);
    exit;
}

$frontend = rtrim((string) ($stripeConfig['frontend_url'] ?? ''), '/');
if ($frontend === '') {
    $frontend = rtrim((string) ($_ENV['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: ''), '/');
}
if ($frontend === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'FRONTEND_URL manquant']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $db->prepare('SELECT * FROM patient_booking_drafts WHERE id = ? AND user_id = ? LIMIT 1');
$stmt->execute([$draftId, $uid]);
$draft = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$draft) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Brouillon introuvable']);
    exit;
}
if (($draft['status'] ?? '') !== 'pending_payment') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Ce brouillon ne peut pas être payé']);
    exit;
}

$expires = strtotime((string) ($draft['expires_at'] ?? ''));
if ($expires !== false && $expires < time()) {
    $u = $db->prepare('UPDATE patient_booking_drafts SET status = ? WHERE id = ?');
    $u->execute(['expired', $draftId]);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Brouillon expiré, recommencez la réservation']);
    exit;
}

if (!empty($draft['stripe_checkout_session_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Session de paiement déjà créée']);
    exit;
}

\Stripe\Stripe::setApiKey($stripeConfig['secret_key']);

$successUrl = $frontend . '/rendez-vous/paiement-reussi?session_id={CHECKOUT_SESSION_ID}';
$cancelUrl = $frontend . '/rendez-vous/nouveau?payment=canceled';

$lineItems = [];
$priceId = trim((string) ($stripeConfig['patient_urgency_price_id'] ?? ''));
if ($priceId !== '') {
    $lineItems[] = ['price' => $priceId, 'quantity' => 1];
} else {
    $lineItems[] = [
        'price_data' => [
            'currency' => 'eur',
            'product_data' => ['name' => PatientUrgencyConfig::productName()],
            'unit_amount' => PatientUrgencyConfig::URGENCY_AMOUNT_CENTS,
        ],
        'quantity' => 1,
    ];
}

try {
    $session = \Stripe\Checkout\Session::create([
        'mode' => 'payment',
        'payment_method_types' => ['card'],
        'line_items' => $lineItems,
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'client_reference_id' => $draftId,
        'metadata' => [
            'checkout_kind' => PatientUrgencyConfig::CHECKOUT_METADATA_KIND,
            'draft_id' => (string) $draftId,
            'user_id' => (string) $uid,
        ],
    ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

$sid = (string) $session->id;
$upd = $db->prepare('UPDATE patient_booking_drafts SET stripe_checkout_session_id = ? WHERE id = ? AND user_id = ?');
$upd->execute([$sid, $draftId, $uid]);

echo json_encode([
    'success' => true,
    'url' => $session->url,
    'session_id' => $sid,
], JSON_UNESCAPED_UNICODE);
