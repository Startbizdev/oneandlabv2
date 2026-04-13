<?php
/**
 * Test des accès qui peuvent provoquer une 500 dans generate-prescription.
 */

echo "Test 1: decryptField avec null (colonnes vides en BDD)\n";
require_once __DIR__ . '/../lib/Crypto.php';
try {
    $config = require __DIR__ . '/../config/encryption.php';
    if (empty($config['kek_hex'])) {
        echo "  SKIP: KEK non configurée\n";
    } else {
        $crypto = new Crypto();
        $out = $crypto->decryptField(null, null);
        echo "  OK\n";
    }
} catch (Throwable $e) {
    echo "  ERREUR: " . $e->getMessage() . " (" . get_class($e) . ")\n";
}

echo "\nTest 2: prescriberRow avec champs null (profil sans chiffrement)\n";
$prescriberRow = ['first_name_encrypted' => null, 'first_name_dek' => null, 'rpps' => null, 'adeli' => null];
try {
    $rpps = $prescriberRow['rpps'] ?? '';
    $decrypt = $prescriberRow['first_name_encrypted'] && $prescriberRow['first_name_dek'] ? 'decrypt' : 'skip';
    echo "  rpps=" . var_export($rpps, true) . " decrypt=$decrypt\n";
} catch (Throwable $e) {
    echo "  ERREUR: " . $e->getMessage() . "\n";
}

echo "\nTest 3: PrescriptionPdf autoload et output\n";
try {
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../lib/PrescriptionPdf.php';
    $pdfContent = PrescriptionPdf::generate(
        ['first_name' => 'Jean', 'last_name' => 'Dupont', 'title' => 'Dr', 'address' => null, 'rpps' => '', 'adeli' => ''],
        ['first_name' => 'Marie', 'last_name' => 'Martin', 'birth_date' => '1990-01-01', 'address' => null],
        'Doliprane 1000mg x 3/jour'
    );
    echo "  PDF length: " . strlen($pdfContent) . " bytes\n";
} catch (Throwable $e) {
    echo "  ERREUR: " . $e->getMessage() . "\n";
}
echo "Done.\n";
