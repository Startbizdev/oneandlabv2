<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/PatientUrgencyGuard.php';

$urgent = ['type' => 'blood_test', 'form_data' => ['availability' => ['type' => 'urgent'], 'patient_urgency' => ['paid' => true]]];
try {
    PatientUrgencyGuard::assertPaidOrNotRequired($urgent, 'patient');
    throw new RuntimeException('Untrusted client paid flag was accepted');
} catch (Exception $error) {
    if ($error instanceof RuntimeException) throw $error;
}
PatientUrgencyGuard::assertPaidOrNotRequired($urgent, 'patient', true);
PatientUrgencyGuard::assertPaidOrNotRequired(['type' => 'blood_test', 'form_data' => []], 'patient');
PatientUrgencyGuard::assertPaidOrNotRequired($urgent, 'nurse');
echo "4 payment trust checks passed\n";
