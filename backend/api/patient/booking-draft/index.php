<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/PatientBookingDraftStorage.php';
require_once __DIR__ . '/../../../lib/PatientUrgencyConfig.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0 || strpos($origin, 'http://127.0.0.1:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * @param list<array<string,mixed>> $payloads
 */
function patientBookingDraftHasBloodUrgency(array $payloads): bool
{
    foreach ($payloads as $p) {
        if (($p['type'] ?? '') !== 'blood_test') {
            continue;
        }
        $fd = $p['form_data'] ?? [];
        if (!is_array($fd)) {
            continue;
        }
        $avRaw = $fd['availability'] ?? '';
        if (!is_string($avRaw) || $avRaw === '') {
            continue;
        }
        $decoded = json_decode($avRaw, true);
        if (is_array($decoded) && ($decoded['type'] ?? '') === 'urgent') {
            return true;
        }
    }
    return false;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();
if (($user['role'] ?? '') !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux patients']);
    exit;
}
$uid = $user['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();

    if (!isset($_POST['payloads']) || !is_string($_POST['payloads'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Champ payloads (JSON) requis']);
        exit;
    }
    $payloads = json_decode($_POST['payloads'], true);
    if (!is_array($payloads) || $payloads === []) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'payloads doit être un tableau non vide']);
        exit;
    }

    if (!patientBookingDraftHasBloodUrgency($payloads)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ce brouillon ne concerne pas une urgence lab']);
        exit;
    }

    foreach ($payloads as $p) {
        if (!is_array($p)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Payload invalide']);
            exit;
        }
        if (($p['patient_id'] ?? '') !== $uid) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'patient_id incorrect']);
            exit;
        }
    }

    $uploads = [];
    foreach ($_FILES ?? [] as $fieldName => $fileInfo) {
        if (!is_string($fieldName) || !preg_match('/^u_(\d+)_(.+)$/', $fieldName, $m)) {
            continue;
        }
        if (!isset($fileInfo['error']) || $fileInfo['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Erreur upload ' . $fieldName]);
            exit;
        }
        $payloadIndex = (int) $m[1];
        $fieldKey = $m[2];
        $origName = isset($fileInfo['name']) ? (string) $fileInfo['name'] : 'file';
        $tmp = isset($fileInfo['tmp_name']) ? (string) $fileInfo['tmp_name'] : '';
        $uploads[] = [
            'payload_index' => $payloadIndex,
            'field_key' => $fieldKey,
            'original_name' => $origName,
            'tmp' => $tmp,
        ];
    }

    $storageSubdir = PatientBookingDraftStorage::makeStorageSubdir();
    $draftDir = PatientBookingDraftStorage::draftDir($storageSubdir);

    $manifestUploads = [];
    foreach ($uploads as $meta) {
        $safeBase =
            preg_replace('/[^a-zA-Z0-9._-]/', '_', (string) $meta['field_key'])
            . '_'
            . bin2hex(random_bytes(6))
            . '_'
            . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename((string) $meta['original_name']));
        $target = $draftDir . '/' . $safeBase;
        if (!isset($meta['tmp']) || !is_uploaded_file((string) $meta['tmp']) || !@move_uploaded_file((string) $meta['tmp'], $target)) {
            foreach (glob($draftDir . '/*') ?: [] as $f) {
                @unlink($f);
            }
            @rmdir($draftDir);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Échec enregistrement fichier']);
            exit;
        }
        $manifestUploads[] = [
            'payload_index' => (int) $meta['payload_index'],
            'field_key' => (string) $meta['field_key'],
            'original_name' => (string) $meta['original_name'],
            'stored_basename' => basename($target),
        ];
    }

    $draftId = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        random_int(0, 65535),
        random_int(0, 65535),
        random_int(0, 65535),
        random_int(0, 4095) | 0x4000,
        random_int(0, 16383) | 0x8000,
        random_int(0, 65535),
        random_int(0, 65535),
        random_int(0, 65535)
    );
    $expires = (new DateTimeImmutable('+65 minutes'))->format('Y-m-d H:i:s');

    $stmt = $db->prepare(
        'INSERT INTO patient_booking_drafts (
          id, user_id, payload_json, files_manifest_json, storage_subdir, status,
          amount_cents, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)'
    );
    $stmt->execute([
        $draftId,
        $uid,
        json_encode($payloads, JSON_UNESCAPED_UNICODE),
        json_encode(['uploads' => $manifestUploads], JSON_UNESCAPED_UNICODE),
        $storageSubdir,
        'pending_payment',
        PatientUrgencyConfig::URGENCY_AMOUNT_CENTS,
        $expires,
    ]);

    echo json_encode(['success' => true, 'data' => ['draft_id' => $draftId]], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
