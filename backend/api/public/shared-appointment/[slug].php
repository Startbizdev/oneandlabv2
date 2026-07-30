<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0) {
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

$token = isset($_GET['slug']) ? trim((string) $_GET['slug']) : null;
if ($token === '' || strlen($token) < 32) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Lien invalide']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

try {
    $stmt = $db->prepare('
        SELECT t.appointment_id, t.expires_at
        FROM appointment_share_tokens t
        WHERE t.token = ?
    ');
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ce lien est invalide ou a expiré.']);
    exit;
}

if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Lien introuvable ou expiré']);
    exit;
}

if (!empty($row['expires_at']) && strtotime($row['expires_at']) < time()) {
    http_response_code(410);
    echo json_encode(['success' => false, 'error' => 'Ce lien a expiré']);
    exit;
}

$appointmentId = $row['appointment_id'];

try {
    $stmt = $db->prepare('
        SELECT a.id, a.type, a.status, a.scheduled_at, a.category_id, a.patient_id,
               a.address_encrypted, a.address_dek, a.form_data_encrypted, a.form_data_dek,
               a.creation_batch_id
        FROM appointments a
        WHERE a.id = ? AND a.type = ?
    ');
    $stmt->execute([$appointmentId, 'nursing']);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ce lien est invalide ou a expiré.']);
    exit;
}

if (!$appointment) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous introuvable']);
    exit;
}

$crypto = new Crypto();

$durationLabels = [
    '1' => '1 jour',
    '7' => '7 jours',
    '10' => '10 jours',
    '15' => '15 jours',
    '30' => '30 jours',
    '60+' => 'Longue durée',
];

/**
 * @param array<string,mixed> $row
 * @return array{appointmentId: string, categoryName: string, dateShort: string, slotLabel: string, durationLabel: string|null}
 */
$buildCareItem = static function (PDO $db, Crypto $crypto, array $row, array $durationLabels): array {
    $categoryName = 'Soins infirmiers';
    if (!empty($row['category_id'])) {
        try {
            $catStmt = $db->prepare('SELECT name FROM care_categories WHERE id = ?');
            $catStmt->execute([$row['category_id']]);
            $cat = $catStmt->fetch(PDO::FETCH_ASSOC);
            if ($cat && !empty($cat['name'])) {
                $categoryName = $cat['name'];
            }
        } catch (PDOException $e) {
            // ignore
        }
    }
    $scheduledAt = $row['scheduled_at'] ?? '';
    $dateShort = '';
    if ($scheduledAt) {
        try {
            $dateShort = (new DateTime($scheduledAt))->format('d/m/Y');
        } catch (Exception $e) {
            $dateShort = (string) $scheduledAt;
        }
    }
    $formData = [];
    if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
        try {
            $formDataJson = $crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
            $formData = json_decode($formDataJson, true) ?? [];
        } catch (Exception $e) {
            $formData = [];
        }
    }
    $slotLabel = 'Toute la journée';
    $availability = $formData['availability'] ?? $formData['availability_type'] ?? null;
    if ($availability !== null) {
        $av = is_string($availability) ? json_decode($availability, true) : $availability;
        if (is_array($av) && isset($av['type'])) {
            if ($av['type'] === 'custom' && !empty($av['range']) && is_array($av['range']) && count($av['range']) >= 2) {
                $slotLabel = (int) $av['range'][0] . 'h - ' . (int) $av['range'][1] . 'h';
            }
        }
    }
    $durationLabel = '';
    $durationDays = $formData['duration_days'] ?? '';
    if ($durationDays === 'custom' && !empty($formData['custom_days'])) {
        $durationLabel = $formData['custom_days'] . ' jours';
    } elseif ($durationDays !== '') {
        $durationLabel = $durationLabels[$durationDays] ?? $durationDays;
    }

    return [
        'appointmentId' => (string) $row['id'],
        'categoryName' => $categoryName,
        'dateShort' => $dateShort,
        'slotLabel' => $slotLabel,
        'durationLabel' => $durationLabel !== '' ? $durationLabel : null,
    ];
};

$batchId = $appointment['creation_batch_id'] ?? null;
$batchPatientId = $appointment['patient_id'] ?? null;
$careItems = [];

if (!empty($batchId) && !empty($batchPatientId)) {
    try {
        $allStmt = $db->prepare('
            SELECT a.id, a.scheduled_at, a.category_id, a.form_data_encrypted, a.form_data_dek
            FROM appointments a
            WHERE a.creation_batch_id = ? AND a.patient_id = ? AND a.type = ?
            ORDER BY a.scheduled_at ASC
        ');
        $allStmt->execute([$batchId, $batchPatientId, 'nursing']);
        while ($row = $allStmt->fetch(PDO::FETCH_ASSOC)) {
            $careItems[] = $buildCareItem($db, $crypto, $row, $durationLabels);
        }
    } catch (PDOException $e) {
        $careItems = [];
    }
}

if ($careItems === []) {
    $careItems[] = $buildCareItem($db, $crypto, $appointment, $durationLabels);
}

// Adresse et âge : depuis le RDV du token (identiques au lot)
$addressFull = '';
if (!empty($appointment['address_encrypted']) && !empty($appointment['address_dek'])) {
    try {
        $decrypted = $crypto->decryptField($appointment['address_encrypted'], $appointment['address_dek']);
        if (is_array($decrypted) && isset($decrypted['label'])) {
            $addressFull = $decrypted['label'];
        } else {
            $addressFull = trim((string) $decrypted);
        }
    } catch (Exception $e) {
        $addressFull = '';
    }
}

$shareFormData = [];
if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
    try {
        $shareFormDataJson = $crypto->decryptField($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        $shareFormData = json_decode($shareFormDataJson, true) ?? [];
    } catch (Exception $e) {
        $shareFormData = [];
    }
}
require_once __DIR__ . '/../../../lib/AddressDisplayFr.php';
$addressFull = AddressDisplayFr::enrichLabelWithFormData($addressFull, $shareFormData);

$patientAge = null;
$patientId = $appointment['patient_id'] ?? null;
if ($patientId) {
    try {
        $userStmt = $db->prepare('SELECT birth_date_encrypted, birth_date_dek FROM users WHERE id = ? AND role = ?');
        $userStmt->execute([$patientId, 'patient']);
        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
        if ($userRow && !empty($userRow['birth_date_encrypted']) && !empty($userRow['birth_date_dek'])) {
            $birthDate = $crypto->decryptField($userRow['birth_date_encrypted'], $userRow['birth_date_dek']);
            $birth = DateTime::createFromFormat('Y-m-d', $birthDate);
            if (!$birth && is_string($birthDate) && preg_match('/^\d{4}-\d{2}-\d{2}/', $birthDate)) {
                $birth = new DateTime(substr($birthDate, 0, 10));
            }
            if ($birth) {
                $now = new DateTime();
                $patientAge = $now->diff($birth)->y;
            }
        }
    } catch (PDOException $e) {
        $patientAge = null;
    } catch (Exception $e) {
        $patientAge = null;
    }
}

$tokenIdStr = (string) $appointmentId;
$primary = $careItems[0];
foreach ($careItems as $it) {
    if ($it['appointmentId'] === $tokenIdStr) {
        $primary = $it;
        break;
    }
}
$scheduledAt = $appointment['scheduled_at'];

echo json_encode([
    'success' => true,
    'data' => [
        'appointmentId' => $appointmentId,
        'type' => 'nursing',
        'status' => $appointment['status'],
        'categoryName' => $primary['categoryName'],
        'scheduledAt' => $scheduledAt,
        'dateShort' => $primary['dateShort'],
        'addressFull' => $addressFull ?: null,
        'slotLabel' => $primary['slotLabel'],
        'durationLabel' => $primary['durationLabel'],
        'patientAge' => $patientAge,
        'careItems' => $careItems,
        'isBatch' => count($careItems) > 1,
    ],
]);
