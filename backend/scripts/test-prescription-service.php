<?php

/**
 * Tests unitaires PrescriptionService (validation, PDF).
 * Usage : php backend/scripts/test-prescription-service.php
 */

require_once __DIR__ . '/../lib/PrescriptionService.php';
require_once __DIR__ . '/../lib/PrescriptionPdf.php';

$failures = 0;

function assertTrue(bool $cond, string $msg): void
{
    global $failures;
    if (!$cond) {
        echo "FAIL: $msg\n";
        $failures++;
    } else {
        echo "OK: $msg\n";
    }
}

echo "=== PrescriptionService tests ===\n";

assertTrue(
    PrescriptionService::resolveKindForRole('nurse', 'medical') === PrescriptionService::KIND_NURSING,
    'nurse force nursing kind'
);
assertTrue(
    PrescriptionService::resolveKindForRole('pro', null) === PrescriptionService::KIND_MEDICAL,
    'pro default medical'
);
assertTrue(
    PrescriptionService::validatePrescriptionText(PrescriptionService::KIND_NURSING, 'Pansement quotidien, surveillance plaie') === null,
    'nursing actes OK'
);
assertTrue(
    PrescriptionService::validatePrescriptionText(PrescriptionService::KIND_NURSING, 'Doliprane 1000mg') !== null,
    'nursing rejects medication keyword'
);
assertTrue(
    PrescriptionService::validatePrescriberCredentials('pro', ['rpps' => '']) !== null,
    'pro requires RPPS'
);
assertTrue(
    PrescriptionService::validatePrescriberCredentials('nurse', ['adeli' => '123456789']) === null,
    'nurse with ADELI OK'
);
assertTrue(
    PrescriptionService::validatePrescriberCredentials('nurse', ['rpps' => '12345678901']) === null,
    'nurse with RPPS OK'
);
assertTrue(
    PrescriptionService::validatePrescriberCredentials('nurse', ['rpps' => '', 'adeli' => '']) !== null,
    'nurse requires RPPS or Adeli'
);

$pdf = PrescriptionPdf::generate(
    ['first_name' => 'Jean', 'last_name' => 'Dupont', 'title' => 'Dr', 'address' => null, 'rpps' => '123', 'adeli' => ''],
    ['first_name' => 'Marie', 'last_name' => 'Martin', 'birth_date' => '1990-01-01', 'address' => null],
    "Pansement\nSurveillance",
    ['kind' => 'nursing', 'prescription_number' => 'RX-TEST-001']
);
assertTrue(strlen($pdf) > 500, 'nursing PDF generated');

$pdfMedical = PrescriptionPdf::generate(
    ['first_name' => 'Jean', 'last_name' => 'Dupont', 'title' => 'Dr', 'address' => null, 'rpps' => '123', 'adeli' => ''],
    ['first_name' => 'Marie', 'last_name' => 'Martin', 'birth_date' => '1990-01-01', 'address' => null],
    'Paracétamol 500mg',
    ['kind' => 'medical', 'prescription_number' => 'RX-TEST-002']
);
assertTrue(strlen($pdfMedical) > 500, 'medical PDF generated');

echo $failures === 0 ? "\nAll tests passed.\n" : "\n$failures test(s) failed.\n";
exit($failures === 0 ? 0 : 1);
