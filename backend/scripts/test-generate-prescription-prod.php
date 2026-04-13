<?php
/**
 * Test generate-prescription sur la prod (à lancer en SSH sur le serveur).
 * Usage: cd /var/www/oneandlab/backend && php scripts/test-generate-prescription-prod.php [appointment_id]
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

$appointmentId = $argv[1] ?? 'd181d4a4-9349-4f09-ac71-ba65b3a88c1a';
$prescriptionText = 'Test ordonnance - Doliprane 1000mg x 3/jour';

echo "=== Test generate-prescription (appointment_id=$appointmentId) ===\n\n";

// Charger .env (racine projet = parent de backend)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
            putenv(trim($name) . '=' . trim($value));
        }
    }
    echo "ENV chargé depuis $envFile\n";
} else {
    echo "WARN: .env non trouvé ($envFile)\n";
}

try {
    $config = require __DIR__ . '/../config/database.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    echo "DB OK\n";

    $encConfig = require __DIR__ . '/../config/encryption.php';
    if (empty($encConfig['kek_hex'])) {
        throw new Exception('BACKEND_KEK_HEX non défini');
    }
    require_once __DIR__ . '/../lib/Crypto.php';
    $crypto = new Crypto();
    echo "Crypto OK\n";

    $stmt = $db->prepare('SELECT id, patient_id, type, status, assigned_nurse_id, created_by, form_data_encrypted, form_data_dek FROM appointments WHERE id = ?');
    $stmt->execute([$appointmentId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$appointment) {
        echo "ERREUR: Rendez-vous $appointmentId introuvable\n";
        exit(1);
    }
    echo "Appointment trouvé (patient_id=" . ($appointment['patient_id'] ?? 'null') . ", created_by=" . ($appointment['created_by'] ?? 'null') . ")\n";

    $user = ['user_id' => $appointment['created_by'] ?? $appointment['assigned_nurse_id'], 'role' => 'nurse'];
    $patientId = $appointment['patient_id'] ?? null;

    $safeDecrypt = function ($encrypted, $dek) use ($crypto) {
        if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') return '';
        try {
            return $crypto->decryptField((string) $encrypted, (string) $dek);
        } catch (Throwable $e) {
            return '';
        }
    };

    echo "Chargement prescriber (user_id={$user['user_id']})...\n";
    $prescriberStmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, address_encrypted, address_dek, rpps_encrypted, rpps_dek, adeli_encrypted, adeli_dek, emploi FROM profiles WHERE id = ?');
    $prescriberStmt->execute([$user['user_id']]);
    $prescriberRow = $prescriberStmt->fetch(PDO::FETCH_ASSOC);
    $prescriberRow = is_array($prescriberRow) ? $prescriberRow : [];
    $prescriber = [
        'first_name' => $safeDecrypt($prescriberRow['first_name_encrypted'] ?? null, $prescriberRow['first_name_dek'] ?? null),
        'last_name' => $safeDecrypt($prescriberRow['last_name_encrypted'] ?? null, $prescriberRow['last_name_dek'] ?? null),
        'title' => (isset($prescriberRow['emploi']) && trim((string) $prescriberRow['emploi']) !== '') ? trim($prescriberRow['emploi']) : 'Infirmier(ère)',
        'address' => $safeDecrypt($prescriberRow['address_encrypted'] ?? null, $prescriberRow['address_dek'] ?? null) ?: null,
        'rpps' => $safeDecrypt($prescriberRow['rpps_encrypted'] ?? null, $prescriberRow['rpps_dek'] ?? null),
        'adeli' => $safeDecrypt($prescriberRow['adeli_encrypted'] ?? null, $prescriberRow['adeli_dek'] ?? null),
    ];
    echo "Prescriber: " . trim($prescriber['first_name'] . ' ' . $prescriber['last_name']) . "\n";

    $patient = ['first_name' => '', 'last_name' => '', 'birth_date' => '', 'address' => null];
    if ($patientId) {
        echo "Chargement patient (patient_id=$patientId)...\n";
        $patientStmt = $db->prepare('SELECT first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, birth_date_encrypted, birth_date_dek, address_encrypted, address_dek FROM profiles WHERE id = ?');
        $patientStmt->execute([$patientId]);
        $patientRow = $patientStmt->fetch(PDO::FETCH_ASSOC);
        $patientRow = is_array($patientRow) ? $patientRow : [];
        $patient = [
            'first_name' => $safeDecrypt($patientRow['first_name_encrypted'] ?? null, $patientRow['first_name_dek'] ?? null),
            'last_name' => $safeDecrypt($patientRow['last_name_encrypted'] ?? null, $patientRow['last_name_dek'] ?? null),
            'birth_date' => $safeDecrypt($patientRow['birth_date_encrypted'] ?? null, $patientRow['birth_date_dek'] ?? null),
            'address' => $safeDecrypt($patientRow['address_encrypted'] ?? null, $patientRow['address_dek'] ?? null) ?: null,
        ];
    }

    $formData = [];
    if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
        echo "Déchiffrement form_data...\n";
        try {
            $fd = $crypto->decryptField($appointment['form_data_encrypted'], $appointment['form_data_dek']);
            $formData = is_string($fd) ? json_decode($fd, true) ?? [] : (is_array($fd) ? $fd : []);
        } catch (Throwable $e) {
            echo "WARN form_data decrypt: " . $e->getMessage() . "\n";
        }
    }
    if (empty($patient['first_name']) && !empty($formData['first_name'])) $patient['first_name'] = (string) $formData['first_name'];
    if (empty($patient['last_name']) && !empty($formData['last_name'])) $patient['last_name'] = (string) $formData['last_name'];
    if (empty($patient['birth_date']) && !empty($formData['birth_date'])) $patient['birth_date'] = (string) $formData['birth_date'];
    echo "Patient: " . trim($patient['first_name'] . ' ' . $patient['last_name']) . "\n";

    echo "Génération PDF...\n";
    require_once __DIR__ . '/../lib/PrescriptionPdf.php';
    $pdfContent = PrescriptionPdf::generate($prescriber, $patient, $prescriptionText);
    echo "OK - PDF généré (" . strlen($pdfContent) . " bytes)\n";
} catch (Throwable $e) {
    echo "\n*** ERREUR ***\n";
    echo get_class($e) . ": " . $e->getMessage() . "\n";
    echo $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n=== Test réussi ===\n";
