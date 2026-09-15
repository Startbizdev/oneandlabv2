<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/AppointmentRequestFingerprint.php';

$checks = 0;
$check = static function (bool $ok) use (&$checks): void {
    if (!$ok) throw new RuntimeException('Request fingerprint regression at assertion ' . ($checks + 1));
    $checks++;
};
$input = ['patient_id' => 'patient', 'type' => 'nursing', 'scheduled_at' => '2027-10-15 08:00:00', 'category_id' => 'injection', 'form_data' => ['care_options' => ['dose' => '10', 'side' => 'left'], 'notes' => 'Original']];
$base = AppointmentRequestFingerprint::forInput($input);
$check(strlen($base) === 64);
$check($base === AppointmentRequestFingerprint::forInput($input));
$reordered = array_reverse($input, true);
$reordered['form_data']['care_options'] = ['side' => 'left', 'dose' => '10'];
$check($base === AppointmentRequestFingerprint::forInput($reordered));
foreach (['patient_id' => 'another-patient', 'relative_id' => 'relative', 'category_id' => 'dressing', 'creation_batch_id' => 'another-batch', 'assigned_nurse_id' => 'another-nurse', 'scheduled_at' => '2027-10-15 09:00:00', 'type' => 'blood_test'] as $key => $value) {
    $changed = $input;
    $changed[$key] = $value;
    $check($base !== AppointmentRequestFingerprint::forInput($changed));
}
foreach ([['dose' => '20', 'side' => 'left'], ['dose' => '10', 'side' => 'right']] as $options) {
    $changed = $input;
    $changed['form_data']['care_options'] = $options;
    $check($base !== AppointmentRequestFingerprint::forInput($changed));
}
$changed = $input;
$changed['form_data']['nursing_items'] = [['category_id' => 'injection'], ['category_id' => 'dressing']];
$check($base !== AppointmentRequestFingerprint::forInput($changed));
$ordered = AppointmentRequestFingerprint::forInput($changed);
$changed['form_data']['nursing_items'] = array_reverse($changed['form_data']['nursing_items']);
$check($ordered !== AppointmentRequestFingerprint::forInput($changed));
$changed = $input;
$changed['form_data'][AppointmentRequestFingerprint::FIELD] = 'client-supplied-marker';
$check($base === AppointmentRequestFingerprint::forInput($changed));
$changed['form_data']['notes'] = 'Different clinical note';
$check($base !== AppointmentRequestFingerprint::forInput($changed));
echo "$checks assertions passed: exact retries, distinct relatives, care, dose, order and request batches.\n";
