<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../lib/Crypto.php';

// CORS
$corsConfig = require __DIR__ . '/../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
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

$id = $_GET['id'] ?? '';
if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID requis']);
    exit;
}

try {
    $config = require __DIR__ . '/../../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

    $selectCols = 'role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, company_name_encrypted, company_name_dek';
    $checkLead = $db->query("SHOW COLUMNS FROM profiles LIKE 'min_booking_lead_time_hours'");
    if ($checkLead && $checkLead->rowCount() > 0) {
        $selectCols .= ', min_booking_lead_time_hours';
    }
    foreach (['accept_rdv_saturday', 'accept_rdv_sunday'] as $col) {
        $c = $db->query("SHOW COLUMNS FROM profiles LIKE " . $db->quote($col));
        if ($c && $c->rowCount() > 0) {
            $selectCols .= ', ' . $col;
        }
    }
    $stmt = $db->prepare("SELECT {$selectCols} FROM profiles WHERE id = ?");
    $stmt->execute([$id]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Profil introuvable']);
        exit;
    }

    $crypto = new Crypto();
    $firstName = $crypto->decryptField($profile['first_name_encrypted'], $profile['first_name_dek']);
    $lastName = $crypto->decryptField($profile['last_name_encrypted'], $profile['last_name_dek']);

    $name = trim($firstName . ' ' . $lastName);
    if (in_array($profile['role'], ['lab', 'subaccount'], true) && !empty($profile['company_name_encrypted']) && !empty($profile['company_name_dek'])) {
        $companyName = $crypto->decryptField($profile['company_name_encrypted'], $profile['company_name_dek']);
        if ($companyName) {
            $name = $companyName;
        }
    }

    $data = ['name' => $name, 'role' => $profile['role']];
    if (in_array($profile['role'], ['lab', 'subaccount'], true)) {
        if (isset($profile['min_booking_lead_time_hours'])) {
            $data['min_booking_lead_time_hours'] = (int) $profile['min_booking_lead_time_hours'];
        }
        if (isset($profile['accept_rdv_saturday'])) {
            $data['accept_rdv_saturday'] = (bool) $profile['accept_rdv_saturday'];
        }
        if (isset($profile['accept_rdv_sunday'])) {
            $data['accept_rdv_sunday'] = (bool) $profile['accept_rdv_sunday'];
        }
    }
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
