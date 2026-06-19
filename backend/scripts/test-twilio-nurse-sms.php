#!/usr/bin/env php
<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Twilio.php';

$to = $argv[1] ?? '+33621542927';
$firstName = $argv[2] ?? 'Sophie';

$twilio = new Twilio();
$twilio->sendNewAppointmentNotification($to, [
    'id' => '00000000-0000-4000-8000-test00000001',
    'scheduled_at' => date('Y-m-d H:i:s', strtotime('+2 days 10:00')),
    'first_name' => $firstName,
    'role' => 'nurse',
    'appointment_type' => 'nursing',
]);
echo "SMS infirmier envoyé vers {$to}\n";
