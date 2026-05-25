<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../../../middleware/CSRFMiddleware.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/AddressDisplayFr.php';
require_once __DIR__ . '/../../../models/User.php';
require_once __DIR__ . '/../../../models/Appointment.php';

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
$roleMiddleware->handle($user, ['super_admin', 'nurse']);

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
           address_encrypted, address_dek, form_data_encrypted, form_data_dek,
           assigned_nurse_id, created_by, creation_batch_id, created_at
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

if ($user['role'] === 'nurse') {
    $assigned = $appointment['assigned_nurse_id'] ?? null;
    $hasAccess = ($assigned === $user['user_id'])
        || (
            ($appointment['created_by'] === $user['user_id'])
            && ($assigned === null || $assigned === '' || $assigned === $user['user_id'])
        );
    if (!$hasAccess && $appointment['status'] === 'pending') {
        $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
        $offerStmt->execute([$appointmentId, $user['user_id']]);
        $hasAccess = $offerStmt->fetch() !== false;
    }
    if (!$hasAccess) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Accès refusé à ce rendez-vous']);
        exit;
    }
}

$repended = false;
$st = $appointment['status'] ?? '';
$assignedNurse = $appointment['assigned_nurse_id'] ?? null;
$needsRepend = !in_array($st, ['completed', 'canceled', 'cancelled', 'refused'], true)
    && (
        (in_array($st, ['confirmed', 'inProgress', 'planned'], true) && !empty($assignedNurse))
        || ($st === 'pending' && !empty($assignedNurse))
    );

/**
 * Repasser en attente (libérer le créneau pour un confrère) : POST uniquement.
 * Un GET ne doit jamais modifier le RDV (sinon prefetch mobile / aperçu = « partage » involontaire).
 */
$shouldReleaseForShare = $_SERVER['REQUEST_METHOD'] === 'POST';

if ($needsRepend && $shouldReleaseForShare) {
    if ($user['role'] === 'nurse' && (string) $assignedNurse !== (string) $user['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Seul l’infirmier assigné peut republier ce rendez-vous via le partage.']);
        exit;
    }

    $batchIdEarly = $appointment['creation_batch_id'] ?? null;
    $batchPatientEarly = $appointment['patient_id'] ?? null;
    $anchorCreatedAt = $appointment['created_at'] ?? null;

    /** Repasse en attente : mêmes critères SQL pour SELECT / UPDATE (lot entier, sans filtre strict sur UUID infirmier — évite 1 seul RDV mis à jour). */
    $rependableWhere = "
        status NOT IN ('completed', 'canceled', 'cancelled', 'refused')
        AND (
            status IN ('confirmed', 'inProgress', 'planned')
            OR (status = 'pending' AND assigned_nurse_id IS NOT NULL AND TRIM(assigned_nurse_id) <> '')
        )
    ";

    $db->beginTransaction();
    try {
        /** @var list<string> */
        $idsToRepend = [];
        if (!empty($batchIdEarly) && !empty($batchPatientEarly) && $user['role'] === 'nurse') {
            $sel = $db->prepare(
                "SELECT id FROM appointments
                 WHERE creation_batch_id = ? AND patient_id = ? AND type = 'nursing'
                 AND {$rependableWhere}"
            );
            $sel->execute([$batchIdEarly, $batchPatientEarly]);
            while ($r = $sel->fetch(PDO::FETCH_ASSOC)) {
                $idsToRepend[] = (string) $r['id'];
            }
            if ($idsToRepend === []) {
                $idsToRepend[] = (string) $appointmentId;
            }
        } elseif (!empty($batchPatientEarly) && $anchorCreatedAt && $user['role'] === 'nurse') {
            // Pas de creation_batch_id (anciennes données ou bug) : même patient + créés dans la même fenêtre
            $sel = $db->prepare(
                "SELECT id FROM appointments
                 WHERE patient_id = ? AND type = 'nursing'
                 AND created_at >= DATE_SUB(?, INTERVAL 3 MINUTE)
                 AND created_at <= DATE_ADD(?, INTERVAL 3 MINUTE)
                 AND {$rependableWhere}"
            );
            $sel->execute([$batchPatientEarly, $anchorCreatedAt, $anchorCreatedAt]);
            while ($r = $sel->fetch(PDO::FETCH_ASSOC)) {
                $idsToRepend[] = (string) $r['id'];
            }
            if ($idsToRepend === []) {
                $idsToRepend[] = (string) $appointmentId;
            }
        } else {
            $idsToRepend[] = (string) $appointmentId;
        }

        foreach ($idsToRepend as $rid) {
            $delOffers = $db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delOffers->execute([$rid]);
        }

        $affectedTotal = 0;
        if (!empty($batchIdEarly) && !empty($batchPatientEarly) && $user['role'] === 'nurse' && count($idsToRepend) > 0) {
            $upd = $db->prepare(
                "UPDATE appointments SET status = 'pending', assigned_nurse_id = NULL, nurse_share_released_at = NOW(), updated_at = NOW()
                 WHERE creation_batch_id = ? AND patient_id = ? AND type = 'nursing'
                 AND {$rependableWhere}"
            );
            $upd->execute([$batchIdEarly, $batchPatientEarly]);
            $affectedTotal = $upd->rowCount();
        } elseif (empty($batchIdEarly) && !empty($batchPatientEarly) && $anchorCreatedAt && $user['role'] === 'nurse' && count($idsToRepend) > 0) {
            $upd = $db->prepare(
                "UPDATE appointments SET status = 'pending', assigned_nurse_id = NULL, nurse_share_released_at = NOW(), updated_at = NOW()
                 WHERE patient_id = ? AND type = 'nursing'
                 AND created_at >= DATE_SUB(?, INTERVAL 3 MINUTE)
                 AND created_at <= DATE_ADD(?, INTERVAL 3 MINUTE)
                 AND {$rependableWhere}"
            );
            $upd->execute([$batchPatientEarly, $anchorCreatedAt, $anchorCreatedAt]);
            $affectedTotal = $upd->rowCount();
        } else {
            $upd = $db->prepare(
                "UPDATE appointments SET status = 'pending', assigned_nurse_id = NULL, nurse_share_released_at = NOW(), updated_at = NOW() WHERE id = ? AND (
                (status IN ('confirmed', 'inProgress', 'planned') AND assigned_nurse_id IS NOT NULL)
                OR (status = 'pending' AND assigned_nurse_id IS NOT NULL)
            )"
            );
            $upd->execute([$appointmentId]);
            $affectedTotal = $upd->rowCount();
        }

        if ($affectedTotal > 0) {
            $noteHist = 'Repasse en attente (partage lien confrère) — sans diffusion zone';
            $insHist = $db->prepare(
                'INSERT INTO appointment_status_updates (id, appointment_id, status, actor_id, actor_role, note, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())'
            );
            foreach ($idsToRepend as $rid) {
                $histId = sprintf(
                    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    random_int(0, 0xffff),
                    random_int(0, 0xffff),
                    random_int(0, 0xffff),
                    random_int(0, 0x4000) | 0x8000,
                    random_int(0, 0xffff),
                    random_int(0, 0xffff),
                    random_int(0, 0xffff),
                    random_int(0, 0xffff)
                );
                $insHist->execute([$histId, $rid, 'pending', $user['user_id'], $user['role'], $noteHist]);
            }
            $repended = true;
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Impossible de republier le rendez-vous']);
        exit;
    }

    $stmt = $db->prepare('
        SELECT id, type, status, scheduled_at, category_id, patient_id,
               address_encrypted, address_dek, form_data_encrypted, form_data_dek,
               assigned_nurse_id, created_by, creation_batch_id
        FROM appointments
        WHERE id = ?
    ');
    $stmt->execute([$appointmentId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
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
        $patient = $userModel->getById($patientId, $user['user_id'] ?? 'system', $user['role'] ?? 'super_admin');
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
$durationDays = isset($formData['duration_days']) ? trim((string) $formData['duration_days']) : '';
if ($durationDays === 'custom' && !empty($formData['custom_days'])) {
    $durationPart = trim((string) $formData['custom_days']) . ' jours';
} elseif (
    $durationDays !== ''
    && strtolower($durationDays) !== 'undefined'
    && strtolower($durationDays) !== 'null'
) {
    $mapped = $durationLabels[$durationDays] ?? $durationDays;
    if ($mapped !== '' && strtolower((string) $mapped) !== 'undefined') {
        $durationPart = $mapped;
    }
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

// Message WhatsApp : nom de voie sans n° + arrondissement + Paris (ex. Google Maps), sans complément ni pays
$addressShare = $addressFull !== '' ? AddressDisplayFr::shareWhatsAppAddressLine($addressFull) : '';
// Message WhatsApp humain — uniquement données réelles, pas de fallback
$line1 = "Une prise en charge est disponible";
if ($addressShare !== '') {
    $line1 .= " à " . $addressShare;
}
$line1 .= " pour " . $patientLabel;
if ($agePart !== '') {
    $line1 .= " de " . $agePart;
}
$line1 .= " le " . $dateFormatted . $creneauPart;

// Liste des soins : lot legacy (plusieurs RDV) OU plusieurs actes sur un même RDV (`appointment_nursing_items`)
$batchId = $appointment['creation_batch_id'] ?? null;
$batchPatientId = $appointment['patient_id'] ?? null;
$careLines = [];
$careItems = [];

$appointmentModelShare = new Appointment();
$sliceForResolved = [
    'id' => (string) $appointmentId,
    'type' => 'nursing',
    'category_id' => $appointment['category_id'] ?? null,
    'category_name' => $categoryName,
    'form_data' => $formData,
];
$nursingResolvedShare = $appointmentModelShare->resolveNursingItemsForAppointment($sliceForResolved, null);

if (!empty($batchId) && !empty($batchPatientId)) {
    $allBatchStmt = $db->prepare('
        SELECT a.id, a.scheduled_at, a.category_id
        FROM appointments a
        WHERE a.creation_batch_id = ?
          AND a.patient_id = ?
          AND a.type = ?
        ORDER BY a.scheduled_at ASC
    ');
    $allBatchStmt->execute([$batchId, $batchPatientId, 'nursing']);
    $batchRows = $allBatchStmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($batchRows) > 1) {
        foreach ($batchRows as $row) {
            $lineCat = 'Soins infirmiers';
            if (!empty($row['category_id'])) {
                $cst = $db->prepare('SELECT name FROM care_categories WHERE id = ?');
                $cst->execute([$row['category_id']]);
                $cr = $cst->fetch(PDO::FETCH_ASSOC);
                if ($cr && !empty($cr['name'])) {
                    $lineCat = $cr['name'];
                }
            }
            $lineDate = '';
            if (!empty($row['scheduled_at'])) {
                try {
                    $lineDate = (new DateTime($row['scheduled_at']))->format('d/m/Y');
                } catch (Exception $e) {
                    $lineDate = (string) $row['scheduled_at'];
                }
            }
            $careLines[] = '• ' . $lineCat . ($lineDate !== '' ? ' — le ' . $lineDate : '');
            $careItems[] = [
                'appointmentId' => (string) $row['id'],
                'categoryName' => $lineCat,
                'dateShort' => $lineDate,
            ];
        }
    }
}

if (count($careItems) <= 1 && count($nursingResolvedShare) > 1) {
    foreach ($nursingResolvedShare as $it) {
        $nm = trim((string) ($it['category_name'] ?? $it['label'] ?? ''));
        if ($nm === '') {
            $nm = 'Soins infirmiers';
        }
        $careLines[] = '• ' . $nm;
        $careItems[] = [
            'appointmentId' => (string) $appointmentId,
            'categoryName' => $nm,
            'dateShort' => $dateFormatted,
        ];
    }
}

$nowParis = new DateTime('now', new DateTimeZone('Europe/Paris'));
$isAfter18hParis = (int) $nowParis->format('G') >= 18;
$greetingLine = $isAfter18hParis
    ? "🌙 Bonsoir à tous !\n\n"
    : "🌞 Bonjour à tous !\n\n";

$shareText = $greetingLine
    . $line1 . ".\n\n";

if (count($careLines) > 1) {
    $shareText .= "Soins du lot (multisoins) :\n" . implode("\n", $careLines) . "\n";
} else {
    $shareText .= "Type de soins :\n"
        . "🩺 " . $categoryName . "\n";
}

if ($durationPart !== '' && count($careLines) <= 1) {
    $shareText .= "\t• Durée du soins : " . $durationPart . "\n";
} elseif ($durationPart !== '' && count($careLines) > 1) {
    $shareText .= "\t• Durée (soin du partage) : " . $durationPart . "\n";
}

$shareText .= "\t• Si quelqu'un est dispo pour assurer cette prise en charge, ce serait top ! 🙏✨\n\n"
    . "Vous pouvez accéder au soins sur ce lien : ";
$shareTextAfterUrl = $isAfter18hParis
    ? "\n\nBonne soirée à tous 🌙"
    : "\n\nBelle journée à tous 👍";

echo json_encode([
    'success' => true,
    'data' => [
        'shareToken' => $token,
        'sharePath' => $sharePath,
        'shareUrl' => $sharePath,
        'shareText' => $shareText,
        'shareTextAfterUrl' => $shareTextAfterUrl,
        'appointmentId' => $appointmentId,
        'repended' => $repended,
        'careItems' => $careItems,
        'isBatch' => count($careItems) > 1,
    ],
]);
