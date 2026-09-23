<?php

declare(strict_types=1);

header('Content-Type: application/json');
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/User.php';

$user = (new AuthMiddleware())->handle();
if (($user['role'] ?? '') !== 'patient') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès patient requis']);
    exit;
}

$config = require __DIR__ . '/../../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);
$patientId = (string) $user['user_id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = $db->prepare('
        SELECT ppa.id, ppa.professional_id, ppa.source, ppa.origin_qr_code_id,
               ppa.hidden_by_patient, ppa.created_at, p.role, p.emploi
        FROM patient_professional_access ppa
        JOIN profiles p ON p.id = ppa.professional_id
        WHERE ppa.patient_id = ?
        ORDER BY ppa.created_at DESC
    ');
    $stmt->execute([$patientId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $names = (new User())->getDisplayNamesByIds(array_column($rows, 'professional_id'));
    foreach ($rows as &$row) {
        $row['display_name'] = $names[(string) $row['professional_id']] ?? 'Professionnel';
        $row['hidden_by_patient'] = (bool) $row['hidden_by_patient'];
    }
    unset($row);
    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
}

if ($method === 'PATCH') {
    CSRFMiddleware::handle();
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    $id = trim((string) ($body['id'] ?? ''));
    if ($id === '' || !array_key_exists('hidden', $body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Relation et préférence requises']);
        exit;
    }
    $stmt = $db->prepare(
        'UPDATE patient_professional_access SET hidden_by_patient = ? WHERE id = ? AND patient_id = ?'
    );
    $stmt->execute([!empty($body['hidden']) ? 1 : 0, $id, $patientId]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Relation introuvable']);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
