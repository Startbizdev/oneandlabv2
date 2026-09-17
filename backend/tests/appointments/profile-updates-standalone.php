<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/AppointmentProfileUpdates.php';
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Profile synchronization regression: ' . ($checks + 1));
    $checks++;
};
$own = ['patient_id' => 'holder', 'form_data' => ['birth_date' => '1990-01-01', 'gender' => 'female', 'address' => ['label' => '10 rue Exemple', 'lat' => 48.8, 'lng' => 2.3]]];
$check(AppointmentProfileUpdates::forAccountHolder($own) === $own['form_data']);
$check(AppointmentProfileUpdates::forAccountHolder($own + ['relative_id' => 'child']) === []);
$check(AppointmentProfileUpdates::forAccountHolder(['relative_id' => 'child', 'birth_date' => '2020-01-01', 'address' => ['label' => 'Other address']]) === []);
$check(AppointmentProfileUpdates::forAccountHolder(['patient_id' => 'holder', 'beneficiary_patient_id' => 'other', 'form_data' => ['birth_date' => '2020-01-01']]) === []);
$check(AppointmentProfileUpdates::forAccountHolder(['patient_id' => 'holder', 'form_data' => ['beneficiary_first_name' => 'Enfant', 'beneficiary_last_name' => 'Test', 'account_holder_first_name' => 'Parent', 'account_holder_last_name' => 'Test', 'gender' => 'female']]) === []);
$check(AppointmentProfileUpdates::forAccountHolder(['patient_id' => 'holder', 'beneficiary_patient_id' => 'holder', 'form_data' => ['birth_date' => '1990-01-01']]) === ['birth_date' => '1990-01-01']);
$check(AppointmentProfileUpdates::forAccountHolder(['form_data' => ['address' => '10 rue Exemple', 'address_complement' => 'Étage 2']]) === ['address' => ['label' => '10 rue Exemple', 'complement' => 'Étage 2']]);
$check(AppointmentProfileUpdates::forAccountHolder(['form_data' => ['address' => '{"label":"Exemple","complement":"A"}', 'address_complement' => 'B']]) === ['address' => ['label' => 'Exemple', 'complement' => 'A']]);
$check(AppointmentProfileUpdates::forAccountHolder(['form_data' => null, 'gender' => 'male']) === ['gender' => 'male']);
$check(AppointmentProfileUpdates::forAccountHolder(['form_data' => ['birth_date' => [], 'gender' => false, 'address' => 7]]) === []);
$check(AppointmentProfileUpdates::forAccountHolder(['form_data' => ['address' => '', 'birth_date' => '']]) === []);
echo "$checks assertions passed: account holder and relative isolation, legacy addresses, complements and invalid fields.\n";
