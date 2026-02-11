<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../models/Notification.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$title = trim((string)($body['title'] ?? ''));
$message = trim((string)($body['message'] ?? ''));
$targetType = trim((string)($body['targetType'] ?? 'role'));
$targetRole = isset($body['targetRole']) ? trim((string)$body['targetRole']) : null;
$userIds = isset($body['userIds']) && is_array($body['userIds']) ? $body['userIds'] : [];

if ($title === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Titre et message sont requis.']);
    exit;
}

$allowedRoles = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];
if ($targetType === 'role') {
    if ($targetRole === '' || !in_array($targetRole, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Rôle cible invalide.']);
        exit;
    }
} elseif ($targetType === 'users') {
    if (empty($userIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Sélectionnez au moins un destinataire.']);
        exit;
    }
    $userIds = array_values(array_unique(array_map('strval', $userIds)));
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Type de cible invalide (role ou users).']);
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
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

if ($targetType === 'role') {
    $stmt = $db->prepare('SELECT id FROM profiles WHERE role = ?');
    $stmt->execute([$targetRole]);
    $userIds = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id');
}

if (empty($userIds)) {
    echo json_encode([
        'success' => true,
        'sentCount' => 0,
        'message' => $targetType === 'role'
            ? 'Aucun utilisateur avec ce rôle.'
            : 'Aucun destinataire valide.',
    ]);
    exit;
}

$roleLabels = [
    'super_admin' => 'Super administrateurs',
    'lab' => 'Laboratoires',
    'subaccount' => 'Sous-comptes lab',
    'preleveur' => 'Préleveurs',
    'nurse' => 'Infirmiers',
    'pro' => 'Professionnels',
    'patient' => 'Patients',
];
$targetLabel = $targetType === 'role' ? ($roleLabels[$targetRole] ?? $targetRole) : (count($userIds) . ' utilisateur(s)');

$campaignId = sprintf(
    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    random_int(0, 0xffff),
    random_int(0, 0xffff),
    random_int(0, 0xffff),
    random_int(0, 0x40) | 0x4000,
    random_int(0, 0x3fff) | 0x8000,
    random_int(0, 0xffff),
    random_int(0, 0xffff),
    random_int(0, 0xffff)
);

$notificationModel = new Notification();
$sentCount = 0;
$metadata = [
    'campaign_id' => $campaignId,
    'target_type' => $targetType,
    'target_label' => $targetLabel,
    'recipient_count' => count($userIds),
    'sent_by' => $user['user_id'],
];
if ($targetType === 'role') {
    $metadata['target_role'] = $targetRole;
}

foreach ($userIds as $recipientId) {
    try {
        $notificationModel->create(
            $recipientId,
            'marketing',
            $title,
            $message,
            $metadata
        );
        $sentCount++;
    } catch (Exception $e) {
        error_log("Admin notification send error for user $recipientId: " . $e->getMessage());
    }
}

echo json_encode([
    'success' => true,
    'sentCount' => $sentCount,
    'campaignId' => $campaignId,
    'targetLabel' => $targetLabel,
]);
