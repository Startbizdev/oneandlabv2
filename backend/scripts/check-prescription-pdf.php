<?php
/**
 * Vérification locale / serveur de la génération PDF ordonnance.
 * Usage: cd backend && php scripts/check-prescription-pdf.php
 */
require_once __DIR__ . '/../lib/PrescriptionPdf.php';

$outDir = __DIR__ . '/../tmp';
if (!is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}
$outFile = $outDir . '/test-prescription.pdf';

try {
    $jpgPath = __DIR__ . '/../assets/logo-cary.jpg';
    if (!is_readable($jpgPath)) {
        throw new RuntimeException('logo-cary.jpg manquant — exécutez backend/scripts/build-logo-jpeg.ps1');
    }

    $pdf = PrescriptionPdf::generate(
        [
            'first_name' => 'Jean',
            'last_name' => 'Dupont',
            'title' => 'Dr',
            'address' => null,
            'rpps' => '12345678901',
            'adeli' => '',
        ],
        [
            'first_name' => 'Marie',
            'last_name' => 'Martin',
            'birth_date' => '1990-01-01',
            'address' => null,
            'nir' => '',
        ],
        "Doliprane 1000 mg\n1 cp x 3/jour pendant 5 jours",
        ['kind' => 'medical', 'prescription_number' => 'RX-TEST-001']
    );

    if (strlen($pdf) < 500) {
        throw new RuntimeException('PDF trop petit (' . strlen($pdf) . ' octets)');
    }

    if (stripos($pdf, 'Image not found') !== false || stripos($pdf, 'type unknown') !== false) {
        throw new RuntimeException('Logo non embarqué dans le PDF (Dompdf broken image)');
    }

    if (strpos($pdf, '/Subtype /Image') === false && strpos($pdf, '/DCTDecode') === false) {
        throw new RuntimeException('Aucune image JPEG détectée dans le PDF');
    }

    file_put_contents($outFile, $pdf);
    echo "OK PDF généré — " . strlen($pdf) . " octets\n";
    echo "Fichier: {$outFile}\n";
    echo 'Logo JPG: ' . (is_readable($jpgPath) ? 'OK' : 'MANQUANT') . "\n";
    echo 'Logo embarqué: OK' . "\n";
    echo 'GD: ' . (function_exists('imagecreatefrompng') ? 'OK' : 'absent') . "\n";
} catch (Throwable $e) {
    echo 'ERR ' . get_class($e) . ': ' . $e->getMessage() . "\n";
    exit(1);
}
