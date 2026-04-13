<?php

/**
 * Liste des ordonnances générées / déposées par le professionnel connecté (medical_documents.document_type = ordonnance).
 * GET uniquement — rôle : pro.
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

if (($user['role'] ?? '') !== 'pro') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès réservé aux professionnels de santé']);
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
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$crypto = new Crypto();

$profileId = $user['user_id'];
$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = (int) ($_GET['limit'] ?? 20);
if ($limit < 1) {
    $limit = 20;
}
if ($limit > 100) {
    $limit = 100;
}
$offset = ($page - 1) * $limit;

$safeDecrypt = function ($encrypted, $dek) use ($crypto) {
    if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') {
        return '';
    }
    try {
        return $crypto->decryptField((string) $encrypted, (string) $dek);
    } catch (Throwable $e) {
        return '';
    }
};

try {
    $countStmt = $db->prepare('
        SELECT COUNT(*) AS total
        FROM medical_documents md
        WHERE md.uploaded_by = ?
          AND md.document_type = \'ordonnance\'
    ');
    $countStmt->execute([$profileId]);
    $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $pages = $total > 0 ? (int) ceil($total / $limit) : 1;

    $stmt = $db->prepare('
        SELECT
            md.id,
            md.appointment_id,
            md.file_name,
            md.file_size,
            md.mime_type,
            md.created_at,
            a.scheduled_at AS appointment_scheduled_at,
            a.status AS appointment_status,
            a.patient_id,
            p.first_name_encrypted AS patient_fn_enc,
            p.first_name_dek AS patient_fn_dek,
            p.last_name_encrypted AS patient_ln_enc,
            p.last_name_dek AS patient_ln_dek
        FROM medical_documents md
        LEFT JOIN appointments a ON a.id = md.appointment_id
        LEFT JOIN profiles p ON p.id = a.patient_id
        WHERE md.uploaded_by = ?
          AND md.document_type = \'ordonnance\'
        ORDER BY md.created_at DESC
        LIMIT ? OFFSET ?
    ');
    $stmt->bindValue(1, $profileId, PDO::PARAM_STR);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->bindValue(3, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $row) {
        $patientFirst = $safeDecrypt($row['patient_fn_enc'] ?? null, $row['patient_fn_dek'] ?? null);
        $patientLast = $safeDecrypt($row['patient_ln_enc'] ?? null, $row['patient_ln_dek'] ?? null);
        unset($row['patient_fn_enc'], $row['patient_fn_dek'], $row['patient_ln_enc'], $row['patient_ln_dek']);
        $row['patient_first_name'] = $patientFirst;
        $row['patient_last_name'] = $patientLast;
        $out[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $out,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => $pages,
        ],
    ]);
} catch (Throwable $e) {
    error_log('pro/prescriptions: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
