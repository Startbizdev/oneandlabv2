<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/upload-limits.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/CarePhotoGallery.php';
require_once __DIR__ . '/../../../lib/NotificationService.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../lib/UploadMimeTypes.php';

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
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$crypto = new Crypto();
$logger = new Logger();
$notificationService = new NotificationService();

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID rendez-vous requis']);
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $docStmt = $db->prepare('
            SELECT id, appointment_id, uploaded_by, file_name, file_size, mime_type, document_type, created_at
            FROM medical_documents
            WHERE appointment_id = ? AND document_type = \'care_photo\'
            ORDER BY created_at ASC
        ');
        $docStmt->execute([$appointmentId]);
        $docs = $docStmt->fetchAll(PDO::FETCH_ASSOC);

        $photoIds = array_column($docs, 'id');
        $commentsByPhoto = [];
        if (!empty($photoIds)) {
            $placeholders = implode(',', array_fill(0, count($photoIds), '?'));
            $cStmt = $db->prepare("
                SELECT id, medical_document_id, author_id, body, created_at
                FROM appointment_care_photo_comments
                WHERE medical_document_id IN ($placeholders)
                ORDER BY created_at ASC
            ");
            $cStmt->execute($photoIds);
            $rows = $cStmt->fetchAll(PDO::FETCH_ASSOC);
            $authorIds = array_unique(array_column($rows, 'author_id'));
            $userModel = new User();
            $names = !empty($authorIds) ? $userModel->getDisplayNamesByIds($authorIds) : [];
            foreach ($rows as $row) {
                $pid = $row['medical_document_id'];
                if (!isset($commentsByPhoto[$pid])) {
                    $commentsByPhoto[$pid] = [];
                }
                $commentsByPhoto[$pid][] = [
                    'id' => $row['id'],
                    'author_id' => $row['author_id'],
                    'author_name' => $names[$row['author_id']] ?? '—',
                    'body' => $row['body'],
                    'created_at' => $row['created_at'],
                ];
            }
        }

        $photos = [];
        foreach ($docs as $d) {
            $photos[] = [
                'id' => $d['id'],
                'uploaded_by' => $d['uploaded_by'],
                'file_name' => $d['file_name'],
                'file_size' => (int) $d['file_size'],
                'mime_type' => $d['mime_type'],
                'created_at' => $d['created_at'],
                'comments' => $commentsByPhoto[$d['id']] ?? [],
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'photos' => $photos,
                'can_upload' => CarePhotoGallery::canUpload($user, $appointment),
                'can_comment' => CarePhotoGallery::canComment($user, $appointment),
            ],
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();

    if (!CarePhotoGallery::canUpload($user, $appointment)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Vous ne pouvez pas ajouter de photos pour ce rendez-vous.']);
        exit;
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Fichier requis ou erreur d\'upload']);
        exit;
    }

    $file = $_FILES['file'];
    $maxSize = ONEANDLAB_MAX_UPLOAD_BYTES;
    $allowedTypes = UploadMimeTypes::CARE_PHOTO;

    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (max 25 Mo)']);
        exit;
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);

    if (!in_array($mimeType, $allowedTypes, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formats acceptés : JPG, PNG, HEIC']);
        exit;
    }

    try {
        $fileContent = file_get_contents($file['tmp_name']);
        if ($fileContent === false) {
            throw new Exception('Erreur lecture fichier');
        }

        $encryptedData = $crypto->encryptFile($fileContent);

        $backendDir = realpath(__DIR__ . '/../../../');
        if ($backendDir === false) {
            $backendDir = __DIR__ . '/../../../';
        }
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $id = CarePhotoGallery::newUuid();
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }

        $filePath = $documentDir . $fileName . '.encrypted';
        $decryptedContent = base64_decode($encryptedData['encrypted'], true);
        if ($decryptedContent === false) {
            throw new Exception('Décodage base64');
        }
        if (file_put_contents($filePath, $decryptedContent) === false) {
            throw new Exception('Écriture fichier');
        }

        $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';

        $ins = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, \'care_photo\', 1, ?, NOW())
        ');
        $ins->execute([
            $id,
            $appointmentId,
            $user['user_id'],
            $fileName,
            $relativePath,
            $file['size'],
            $mimeType,
            $encryptedData['dek'],
        ]);

        $logger->log(
            $user['user_id'],
            $user['role'],
            'create',
            'care_photo',
            $id,
            ['appointment_id' => $appointmentId]
        );

        $userModel = new User();
        $role = (string) ($user['role'] ?? '');

        if ($role === 'nurse') {
            $creatorId = (string) ($appointment['created_by'] ?? '');
            if ($creatorId !== '' && $creatorId !== (string) $user['user_id']) {
                $nurseNames = $userModel->getDisplayNamesByIds([(string) $user['user_id']]);
                $nurseName = $nurseNames[(string) $user['user_id']] ?? 'Infirmier';
                $notificationService->createNotification(
                    $creatorId,
                    'care_gallery_photo',
                    'Photos de soins ajoutées',
                    $nurseName . ' a ajouté une photo pour un rendez-vous que vous avez créé.',
                    [
                        'appointment_id' => $appointmentId,
                        'photo_id' => $id,
                    ]
                );
            }
        } elseif ($role === 'pro') {
            $nurseId = (string) ($appointment['assigned_nurse_id'] ?? '');
            if ($nurseId !== '' && $nurseId !== (string) $user['user_id']) {
                $proNames = $userModel->getDisplayNamesByIds([(string) $user['user_id']]);
                $proName = $proNames[(string) $user['user_id']] ?? 'Professionnel';
                $notificationService->createNotification(
                    $nurseId,
                    'care_gallery_photo',
                    'Photos de soins ajoutées',
                    $proName . ' a ajouté une photo pour un rendez-vous.',
                    [
                        'appointment_id' => $appointmentId,
                        'photo_id' => $id,
                    ]
                );
            }
        }

        echo json_encode([
            'success' => true,
            'data' => ['id' => $id],
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
