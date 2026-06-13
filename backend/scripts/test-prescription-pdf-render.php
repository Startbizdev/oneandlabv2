<?php
require_once __DIR__ . '/../lib/PrescriptionPdf.php';

try {
    $pdf = PrescriptionPdf::generate(
        ['first_name' => 'Jean', 'last_name' => 'Dupont', 'title' => 'Dr', 'address' => null, 'rpps' => '12345678901', 'adeli' => ''],
        ['first_name' => 'Marie', 'last_name' => 'Martin', 'birth_date' => '1990-01-01', 'address' => null, 'nir' => ''],
        "Doliprane 1000 mg\n1 cp x 3/jour pendant 5 jours",
        ['kind' => 'medical', 'prescription_number' => 'RX-TEST-001']
    );
    echo 'OK length=' . strlen($pdf) . "\n";
} catch (Throwable $e) {
    echo 'ERR ' . get_class($e) . ': ' . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
