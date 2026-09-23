<?php

declare(strict_types=1);

require_once __DIR__ . '/../../pharmacy/_helpers.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../lib/pharmacy/PharmacyOrderConversation.php';
require_once __DIR__ . '/../../../models/User.php';

[$user, $db, $moduleConfig, $orderService] = pharmacyApiBootstrap(['GET', 'POST', 'OPTIONS']);
$notifications = new NotificationService();
$userModel = new User();

$orderId = trim((string) ($_GET['id'] ?? ''));
if ($orderId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

$stmt = $db->prepare('SELECT * FROM pharmacy_orders WHERE id = ? LIMIT 1');
$stmt->execute([$orderId]);
$orderRow = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$orderRow) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Commande introuvable']);
    exit;
}

$order = [
    'id' => (string) $orderRow['id'],
    'requester_id' => (string) $orderRow['requester_id'],
    'pharmacy_id' => (string) $orderRow['pharmacy_id'],
    'patient_id' => (string) $orderRow['patient_id'],
    'status' => (string) $orderRow['status'],
];

if (!PharmacyOrderConversation::canAccess($user, $order)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $msgStmt = $db->prepare('
        SELECT m.id, m.order_id, m.author_id, m.body, m.medical_document_id, m.created_at
        FROM pharmacy_order_messages m
        WHERE m.order_id = ?
        ORDER BY m.created_at ASC
        LIMIT 500
    ');
    $msgStmt->execute([$orderId]);
    $rows = $msgStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $authorIds = array_column($rows, 'author_id');
    $names = $userModel->getDisplayNamesByIds($authorIds);
    $messages = [];
    foreach ($rows as $row) {
        $authorId = (string) $row['author_id'];
        $messages[] = [
            'id' => (string) $row['id'],
            'order_id' => (string) $row['order_id'],
            'author_id' => $authorId,
            'author_name' => $names[$authorId] ?? 'Utilisateur',
            'body' => (string) $row['body'],
            'medical_document_id' => $row['medical_document_id'] !== null
                ? (string) $row['medical_document_id']
                : null,
            'created_at' => (string) $row['created_at'],
        ];
    }
    echo json_encode([
        'success' => true,
        'data' => [
            'messages' => $messages,
            'can_post' => PharmacyOrderConversation::canPost($user, $order),
        ],
    ]);
    exit;
}

if ($method === 'POST') {
    if (!PharmacyOrderConversation::canPost($user, $order)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Conversation fermée']);
        exit;
    }
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON invalide']);
        exit;
    }
    $text = trim((string) ($body['body'] ?? ''));
    if ($text === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Message vide']);
        exit;
    }
    $messageId = PharmacyOrderConversation::newUuid();
    $authorId = (string) ($user['user_id'] ?? '');
    $db->prepare('
        INSERT INTO pharmacy_order_messages (id, order_id, author_id, body)
        VALUES (?, ?, ?, ?)
    ')->execute([$messageId, $orderId, $authorId, $text]);

    $recipientId = $authorId === $order['requester_id']
        ? $order['pharmacy_id']
        : $order['requester_id'];
    $names = $userModel->getDisplayNamesByIds([$authorId]);
    $authorName = $names[$authorId] ?? 'Interlocuteur';
    $notifications->createNotification(
        $recipientId,
        'pharmacy_order_message',
        'Nouveau message — commande pharmacie',
        $authorName . ' : ' . mb_substr($text, 0, 120),
        ['pharmacy_order_id' => $orderId, 'message_id' => $messageId],
    );

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $messageId,
            'order_id' => $orderId,
            'author_id' => $authorId,
            'body' => $text,
            'created_at' => date('c'),
        ],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
