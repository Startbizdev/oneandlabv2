#!/usr/bin/env php
<?php
/**
 * Worker : exécute dispatch + notifications pour un RDV créé.
 * Appelé en arrière-plan par l'API POST /appointments pour éviter timeout/crash.
 * Usage: php process-appointment-notifications.php <appointment_id>
 */
$id = $argv[1] ?? null;
if (!$id || !preg_match('/^[a-f0-9-]{36}$/i', $id)) {
    error_log('process-appointment-notifications: appointment_id requis (UUID)');
    exit(1);
}

$backendDir = dirname(__DIR__);
chdir($backendDir);

require_once $backendDir . '/config/database.php';
require_once $backendDir . '/models/Appointment.php';

try {
    $config = require $backendDir . '/config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

    $stmt = $db->prepare('SELECT type, location_lat, location_lng, scheduled_at, patient_id FROM appointments WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        error_log("process-appointment-notifications: RDV {$id} introuvable");
        exit(1);
    }

    $patientEmail = null;
    if (!empty($row['patient_id'])) {
        $stmtU = $db->prepare('SELECT email_encrypted, email_dek FROM profiles WHERE id = ?');
        $stmtU->execute([$row['patient_id']]);
        $u = $stmtU->fetch(PDO::FETCH_ASSOC);
        if ($u && !empty($u['email_encrypted']) && !empty($u['email_dek'])) {
            require_once $backendDir . '/lib/Crypto.php';
            $crypto = new Crypto();
            $patientEmail = $crypto->decryptField($u['email_encrypted'], $u['email_dek']);
        }
    }

    $input = [
        'type' => $row['type'] ?? '',
        'address' => [
            'lat' => isset($row['location_lat']) ? (float) $row['location_lat'] : 0.0,
            'lng' => isset($row['location_lng']) ? (float) $row['location_lng'] : 0.0,
        ],
        'scheduled_at' => $row['scheduled_at'] ?? null,
        'patient_id' => $row['patient_id'] ?? null,
        'patient_email' => $patientEmail,
    ];

    $appointment = new Appointment();
    $appointment->runPostCreateNotifications($id, $input);
} catch (Throwable $e) {
    error_log('process-appointment-notifications: ' . $e->getMessage());
    exit(1);
}
exit(0);
