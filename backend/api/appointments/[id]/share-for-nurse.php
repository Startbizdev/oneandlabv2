<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../models/User.php';

$corsConfig = require __DIR__ . '/../../../config/cors.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $corsConfig['allowed_origins'], true) || strpos($origin, 'http://localhost:') === 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authMiddleware = new AuthMiddleware();
$user = $authMiddleware->handle();

$roleMiddleware = new RoleMiddleware();
$roleMiddleware->handle($user, ['super_admin', 'admin']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRFMiddleware::handle();
}

$appointmentId = $_GET['id'] ?? null;
if (!$appointmentId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID du rendez-vous requis']);
    exit;
}

$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$stmt = $db->prepare('
    SELECT id, type, status, scheduled_at, category_id, patient_id,
           address_encrypted, address_dek, form_data_encrypted, form_data_dek
    FROM appointments
    WHERE id = ?
');
$stmt->execute([$appointmentId]);
$appointment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$appointment || $appointment['type'] !== 'nursing') {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Rendez-vous soins infirmiers introuvable']);
    exit;
}

$categoryName = 'Soins infirmiers';
if (!empty($appointment['category_id'])) {
    $catStmt = $db->prepare('SELECT name FROM care_categories WHERE id = ?');
    $catStmt->execute([$appointment['category_id']]);
    $cat = $catStmt->fetch(PDO::FETCH_ASSOC);
    if ($cat && !empty($cat['name'])) {
        $categoryName = $cat['name'];
    }
}

$crypto = new Crypto();

// Adresse complète (déchiffrée)
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
// form_data pour créneau, durée, etc.
$formData = [];
if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
    try {
        $formDataJson = $crypto->decryptField($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        $formData = json_decode($formDataJson, true) ?? [];
    } catch (Exception $e) {
        $formData = [];
    }
}

// Date : uniquement jour (sans heure)
$scheduledAt = $appointment['scheduled_at'];
$dateFormatted = '';
if ($scheduledAt) {
    try {
        $dt = new DateTime($scheduledAt);
        $dateFormatted = $dt->format('d/m/Y');
    } catch (Exception $e) {
        $dateFormatted = $scheduledAt;
    }
}

// Créneau : si toute la journée, ne pas afficher de créneau
$creneauPart = '';
$availability = $formData['availability'] ?? $formData['availability_type'] ?? null;
if ($availability !== null) {
    $av = is_string($availability) ? json_decode($availability, true) : $availability;
    if (is_array($av) && isset($av['type'])) {
        if ($av['type'] === 'all_day') {
            $creneauPart = '';
        } elseif ($av['type'] === 'custom' && !empty($av['range']) && is_array($av['range']) && count($av['range']) >= 2) {
            $creneauPart = ' à ' . (int)$av['range'][0] . 'h - ' . (int)$av['range'][1] . 'h';
        }
    }
}

// Âge et genre du patient (profil patient)
$patientAge = null;
$patientGenre = null; // 'F' / 'female' => féminin, sinon masculin
$patientId = $appointment['patient_id'] ?? null;
if ($patientId) {
    try {
        $userModel = new User();
        $patient = $userModel->getById($patientId, $user['user_id'] ?? 'system', $user['role'] ?? 'admin');
        if ($patient) {
            if (!empty($patient['birth_date'])) {
                $birthDate = $patient['birth_date'];
                $birth = DateTime::createFromFormat('Y-m-d', $birthDate);
                if (!$birth && is_string($birthDate) && preg_match('/^\d{4}-\d{2}-\d{2}/', $birthDate)) {
                    $birth = new DateTime(substr($birthDate, 0, 10));
                }
                if ($birth) {
                    $now = new DateTime();
                    $patientAge = $now->diff($birth)->y;
                }
            }
            if (!empty($patient['gender'])) {
                $patientGenre = trim((string) $patient['gender']);
            }
        }
    } catch (Exception $e) {
        $patientAge = null;
        $patientGenre = null;
    }
}
$agePart = $patientAge !== null ? $patientAge . ' ans' : '';
// Un patient / une patiente selon le genre
$patientLabel = (in_array(strtolower($patientGenre ?? ''), ['f', 'female'], true)) ? 'une patiente' : 'un patient';

// Durée du soins (form_data.duration_days)
$durationLabels = [
    '1' => '1 jour',
    '7' => '7 jours',
    '10' => '10 jours',
    '15' => '15 jours',
    '30' => '30 jours',
    '60+' => 'Longue durée',
];
$durationPart = '';
$durationDays = $formData['duration_days'] ?? '';
if ($durationDays === 'custom' && !empty($formData['custom_days'])) {
    $durationPart = $formData['custom_days'] . ' jours';
} elseif ($durationDays !== '') {
    $durationPart = $durationLabels[$durationDays] ?? $durationDays;
}

// Récupérer ou créer le token
$stmt = $db->prepare('SELECT token, expires_at FROM appointment_share_tokens WHERE appointment_id = ? ORDER BY created_at DESC LIMIT 1');
$stmt->execute([$appointmentId]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

$expiresAt = null;
$tokenValidDays = 7;
if ($tokenValidDays > 0) {
    $expiresAt = (new DateTime())->modify("+{$tokenValidDays} days")->format('Y-m-d H:i:s');
}

if ($existing && (empty($existing['expires_at']) || strtotime($existing['expires_at']) > time())) {
    $token = $existing['token'];
} else {
    $token = bin2hex(random_bytes(32));
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0x4000) | 0x8000, random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff));
    $insert = $db->prepare('INSERT INTO appointment_share_tokens (id, appointment_id, token, created_at, expires_at) VALUES (?, ?, ?, NOW(), ?)');
    $insert->execute([$id, $appointmentId, $token, $expiresAt]);
}

$sharePath = "/p/rdv/{$token}";

// Message WhatsApp humain — uniquement données réelles, pas de fallback
$line1 = "Une prise en charge est disponible";
if ($addressFull !== '') {
    $line1 .= " à " . $addressFull;
}
$line1 .= " pour " . $patientLabel;
if ($agePart !== '') {
    $line1 .= " de " . $agePart;
}
$line1 .= " le " . $dateFormatted . $creneauPart;

$shareText = "🌞 Bonjour à tous !\n\n"
    . $line1 . ".\n\n"
    . "Type de soins :\n"
    . "🩺 " . $categoryName . "\n";

if ($durationPart !== '') {
    $shareText .= "\t• Durée du soins : " . $durationPart . "\n";
}

$shareText .= "\t• Si quelqu'un est dispo pour assurer cette prise en charge, ce serait top ! 🙏✨\n\n"
    . "Vous pouvez accéder au soins sur ce lien : ";
$shareTextAfterUrl = "\n\nBelle journée à tous 👍";

echo json_encode([
    'success' => true,
    'data' => [
        'shareToken' => $token,
        'sharePath' => $sharePath,
        'shareUrl' => $sharePath,
        'shareText' => $shareText,
        'shareTextAfterUrl' => $shareTextAfterUrl,
        'appointmentId' => $appointmentId,
    ],
]);
