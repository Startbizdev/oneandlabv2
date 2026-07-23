#!/usr/bin/env php
<?php
/**
 * Envoie un SMS de test pour chaque modèle Cary (Twilio).
 * Usage: php scripts/test-twilio-all-sms.php +33621542927
 */
$to = isset($argv[1]) ? trim($argv[1]) : '';
if ($to === '') {
    fwrite(STDERR, "Usage: php scripts/test-twilio-all-sms.php <numéro E.164>\n");
    exit(1);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Twilio.php';

$twilio = new Twilio();
$baseUrl = rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
$fakeId = '00000000-0000-4000-8000-test00000001';
$scheduledAt = date('Y-m-d H:i:s', strtotime('+2 days 10:00'));

$tests = [
    '1_nouveau_rdv_infirmier' => function () use ($twilio, $to, $fakeId, $scheduledAt) {
        return $twilio->sendNewAppointmentNotification($to, [
            'id' => $fakeId,
            'scheduled_at' => $scheduledAt,
            'first_name' => 'Sophie',
            'role' => 'nurse',
            'appointment_type' => 'nursing',
        ]);
    },
    '2_rdv_confirme_patient' => function () use ($twilio, $to, $fakeId, $scheduledAt) {
        return $twilio->sendAppointmentConfirmation($to, [
            'id' => $fakeId,
            'scheduled_at' => $scheduledAt,
            'type' => 'nursing',
        ]);
    },
    '3_lot_confirme' => function () use ($twilio, $to, $fakeId) {
        return $twilio->sendAppointmentConfirmation($to, [
            'id' => $fakeId,
            'batch_count' => 3,
            'type' => 'nursing',
        ]);
    },
];

echo "Envoi de " . count($tests) . " SMS test vers {$to}...\n\n";
$ok = 0;
$fail = 0;

foreach ($tests as $label => $send) {
    try {
        $result = $send();
        if ($result === false) {
            throw new RuntimeException('send() a retourné false');
        }
        echo "✅ {$label}\n";
        $ok++;
    } catch (Throwable $e) {
        echo "❌ {$label} — " . $e->getMessage() . "\n";
        $fail++;
    }
    usleep(800000);
}

echo "\nTerminé : {$ok} OK, {$fail} échec(s).\n";
exit($fail > 0 ? 1 : 0);
