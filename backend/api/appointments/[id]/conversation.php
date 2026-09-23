<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/upload-limits.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/AppointmentConversation.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../lib/BusinessNotificationPolicy.php';
require_once __DIR__ . '/../../../lib/UploadMimeTypes.php';
require_once __DIR__ . '/../../../models/User.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);
$crypto = new Crypto();
$logger = new Logger();
$notificationService = new NotificationService();
$userModel = new User();

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID rendez-vous requis']);
    exit;
}

$stmt = $db->prepare('
    SELECT id, type, status, patient_id, assigned_nurse_id, assigned_lab_id, assigned_to,
           assigned_pro_id, created_by, created_by_role
    FROM appointments WHERE id = ?
');
$stmt->execute([$appointmentId]);
$appointment = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$appointment) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
    exit;
}

if (!AppointmentConversation::canAccess($user, $appointment)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

function notifyConversationParticipants(
    NotificationService $notificationService,
    User $userModel,
    array $user,
    array $appointment,
    string $appointmentId,
    string $messageId,
    string $preview
): void {
    $authorId = (string) ($user['user_id'] ?? '');

    $names = $userModel->getDisplayNamesByIds([$authorId]);
    $authorName = $names[$authorId] ?? 'Interlocuteur';
    $recipients = BusinessNotificationPolicy::conversationRecipientIds($appointment, $authorId);

    foreach ($recipients as $recipientId) {
        $notificationService->createNotification(
            $recipientId,
            'conversation_message',
            'Nouveau message',
            $authorName . ' : ' . mb_substr($preview, 0, 120),
            [
                'appointment_id' => $appointmentId,
                'message_id' => $messageId,
            ]
        );
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $msgStmt = $db->prepare('
        SELECT m.id, m.appointment_id, m.author_id, m.body, m.medical_document_id, m.created_at,
               md.file_name, md.mime_type, md.document_type
        FROM appointment_conversation_messages m
        LEFT JOIN medical_documents md ON md.id = m.medical_document_id
        WHERE m.appointment_id = ?
        ORDER BY m.created_at ASC
        LIMIT 500
    ');
    $msgStmt->execute([$appointmentId]);
    $rows = $msgStmt->fetchAll(PDO::FETCH_ASSOC);
    $authorIds = array_column($rows, 'author_id');
    $names = $userModel->getDisplayNamesByIds($authorIds);

    $messages = [];
    foreach ($rows as $row) {
        $messages[] = [
            'id' => $row['id'],
            'appointment_id' => $row['appointment_id'],
            'author_id' => $row['author_id'],
            'author_name' => $names[(string) $row['author_id']] ?? '',
            'body' => $row['body'],
            'medical_document_id' => $row['medical_document_id'],
            'attachment' => $row['medical_document_id']
                ? [
                    'id' => $row['medical_document_id'],
                    'file_name' => $row['file_name'],
                    'mime_type' => $row['mime_type'],
                    'document_type' => $row['document_type'],
                ]
                : null,
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'messages' => $messages,
            'can_post' => AppointmentConversation::canPost($user, $appointment),
        ],
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();

    if (!AppointmentConversation::canPost($user, $appointment)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Conversation fermée pour ce rendez-vous']);
        exit;
    }

    $body = '';
    $medicalDocumentId = null;
    $attachment = null;

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        if ($file['size'] > ONEANDLAB_MAX_UPLOAD_BYTES) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 25 Mo)']);
            exit;
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        $allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp'];
        if (!in_array($mimeType, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Formats acceptés : JPG, PNG, PDF, WEBP']);
            exit;
        }
        $fileContent = file_get_contents($file['tmp_name']);
        if ($fileContent === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Lecture fichier impossible']);
            exit;
        }
        $encryptedData = $crypto->encryptFile($fileContent);
        $backendDir = realpath(__DIR__ . '/../../../') ?: __DIR__ . '/../../../';
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $docId = AppointmentConversation::newUuid();
        $fileName = UploadMimeTypes::safeFilename((string) $file['name'], $mimeType);
        $documentDir = $uploadDir . $docId . '/';
        mkdir($documentDir, 0755, true);
        $filePath = $documentDir . $fileName . '.encrypted';
        $decryptedContent = base64_decode($encryptedData['encrypted'], true);
        file_put_contents($filePath, $decryptedContent);
        $relativePath = '/uploads/medical/' . $docId . '/' . $fileName . '.encrypted';
        $insDoc = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, \'conversation_attachment\', 1, ?, NOW())
        ');
        $insDoc->execute([
            $docId,
            $appointmentId,
            $user['user_id'],
            $fileName,
            $relativePath,
            $file['size'],
            $mimeType,
            $encryptedData['dek'],
        ]);
        $medicalDocumentId = $docId;
        $attachment = [
            'id' => $docId,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'document_type' => 'conversation_attachment',
        ];
        $body = trim((string) ($_POST['body'] ?? ''));
        if ($body === '') {
            $body = '[Pièce jointe]';
        }
    } else {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $body = trim((string) ($input['body'] ?? ''));
    }

    if ($body === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Message requis']);
        exit;
    }
    if (mb_strlen($body) > 4000) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Message trop long (max 4000 caractères)']);
        exit;
    }

    $messageId = AppointmentConversation::newUuid();
    $ins = $db->prepare('
        INSERT INTO appointment_conversation_messages (id, appointment_id, author_id, body, medical_document_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ');
    $ins->execute([$messageId, $appointmentId, $user['user_id'], $body, $medicalDocumentId]);

    $logger->log($user['user_id'], $user['role'], 'create', 'appointment_conversation_message', $messageId, [
        'appointment_id' => $appointmentId,
    ]);

    notifyConversationParticipants(
        $notificationService,
        $userModel,
        $user,
        $appointment,
        (string) $appointmentId,
        $messageId,
        $body
    );

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $messageId,
            'appointment_id' => $appointmentId,
            'author_id' => (string) $user['user_id'],
            'author_name' => $userModel->getDisplayNamesByIds([(string) $user['user_id']])[(string) $user['user_id']] ?? '',
            'body' => $body,
            'medical_document_id' => $medicalDocumentId,
            'attachment' => $attachment,
            'created_at' => date('c'),
        ],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
