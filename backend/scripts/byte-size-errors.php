<?php
$msgs = [
    ['error' => 'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.', 'code' => 'PATIENT_BOOKING_CONSENT_REQUIRED'],
    ['error' => 'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.', 'code' => 'VALIDATION_ERROR'],
    ['error' => 'Type de rendez-vous invalide. Doit être "blood_test" ou "nursing".', 'code' => 'VALIDATION_ERROR'],
];
foreach ($msgs as $m) {
    $j = json_encode(['success' => false] + $m);
    echo strlen((string) $j) . " {$m['code']} => {$m['error']}\n";
}
