<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/AppointmentSchedule.php';
$checks = 0;
foreach ([
    '2027-10-15 08:00:00' => '2027-10-15 08:00:00',
    '2027-10-15T08:00' => '2027-10-15 08:00:00',
    '2027-10-15T06:00:00.000Z' => '2027-10-15 08:00:00',
    '2027-01-15T07:00:00Z' => '2027-01-15 08:00:00',
    '2027-10-15T08:00:00+02:00' => '2027-10-15 08:00:00',
    '2027-10-15T10:00:00+04:00' => '2027-10-15 08:00:00',
] as $input => $expected) {
    if (AppointmentSchedule::forStorage($input) !== $expected) throw new RuntimeException('Appointment clock shifted');
    $checks++;
}
foreach (['2027-02-30 08:00:00', '2027-10-15 25:00:00', 'tomorrow', 'not-a-date'] as $input) {
    try {
        AppointmentSchedule::forStorage($input);
        throw new RuntimeException('Invalid appointment date accepted');
    } catch (InvalidArgumentException $expected) { $checks++; }
}
echo "{$checks} assertions passed: France appointment clock and explicit timezones.\n";
