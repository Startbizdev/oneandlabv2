<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/CarePhotoGallery.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../models/User.php';

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

CSRFMiddleware::handle();

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$logger = new Logger();
$notificationService = new NotificationService();

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID rendez-vous requis']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$medicalDocumentId = isset($input['medical_document_id']) ? trim((string) $input['medical_document_id']) : '';
$body = isset($input['body']) ? trim((string) $input['body']) : '';

if ($body === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Message requis']);
    exit;
}

if (mb_strlen($body) > 4000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Commentaire trop long (max 4000 caractères)']);
    exit;
}

$stmt = $db->prepare('
    SELECT id, type, status, patient_id, assigned_nurse_id, created_by, created_by_role
    FROM appointments
    WHERE id = ?
');
$stmt->execute([$appointmentId]);
$appointment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$appointment) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
    exit;
}

if (!CarePhotoGallery::canView($user, $appointment)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
}

if (!CarePhotoGallery::canComment($user, $appointment)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Vous ne pouvez pas commenter sur ce rendez-vous.']);
    exit;
}

$crypto = new Crypto();

if ($medicalDocumentId === '') {
    try {
        $medicalDocumentId = CarePhotoGallery::ensureThreadDocument(
            $db,
            $crypto,
            (string) $appointmentId,
            (string) $user['user_id']
        );
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

$docStmt = $db->prepare('
    SELECT id, appointment_id, document_type
    FROM medical_documents
    WHERE id = ? AND appointment_id = ?
');
$docStmt->execute([$medicalDocumentId, $appointmentId]);
$doc = $docStmt->fetch(PDO::FETCH_ASSOC);

if (!$doc || ($doc['document_type'] ?? '') !== 'care_photo') {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Photo introuvable']);
    exit;
}

try {
    $commentId = CarePhotoGallery::newUuid();
    $ins = $db->prepare('
        INSERT INTO appointment_care_photo_comments (id, medical_document_id, author_id, body, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ');
    $ins->execute([$commentId, $medicalDocumentId, $user['user_id'], $body]);

    $logger->log(
        $user['user_id'],
        $user['role'],
        'create',
        'care_photo_comment',
        $commentId,
        ['appointment_id' => $appointmentId, 'medical_document_id' => $medicalDocumentId]
    );

    $userModel = new User();
    $role = $user['role'] ?? '';

    if ($role === 'pro') {
        $nurseId = (string) ($appointment['assigned_nurse_id'] ?? '');
        if ($nurseId !== '') {
            $proNames = $userModel->getDisplayNamesByIds([(string) $user['user_id']]);
            $proName = $proNames[(string) $user['user_id']] ?? 'Professionnel';
            $notificationService->createNotification(
                $nurseId,
                'care_gallery_comment',
                'Message sur vos photos de soins',
                $proName . ' a commenté une photo de soins.',
                [
                    'appointment_id' => $appointmentId,
                    'photo_id' => $medicalDocumentId,
                    'comment_id' => $commentId,
                ]
            );
        }
    } elseif ($role === 'nurse') {
        $creatorId = (string) ($appointment['created_by'] ?? '');
        if ($creatorId !== '' && $creatorId !== (string) $user['user_id']) {
            $nurseNames = $userModel->getDisplayNamesByIds([(string) $user['user_id']]);
            $nurseName = $nurseNames[(string) $user['user_id']] ?? 'Infirmier';
            $notificationService->createNotification(
                $creatorId,
                'care_gallery_comment',
                'Nouveau commentaire sur la galerie',
                $nurseName . ' a commenté une photo de soins.',
                [
                    'appointment_id' => $appointmentId,
                    'photo_id' => $medicalDocumentId,
                    'comment_id' => $commentId,
                ]
            );
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $commentId,
            'medical_document_id' => $medicalDocumentId,
            'author_id' => $user['user_id'],
            'body' => $body,
            'created_at' => date('c'),
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
