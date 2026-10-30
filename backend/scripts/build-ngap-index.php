<?php

declare(strict_types=1);

/**
 * Construit resources/ngap/ngap-index.json depuis le PDF officiel de la NGAP (ameli.fr).
 * Usage : php scripts/build-ngap-index.php [chemin/vers/ngap.pdf]   (pdftotext requis)
 *         php scripts/build-ngap-index.php ngap.txt ngap.pdf          (texte déjà extrait par pdftotext -layout)
 */

require_once __DIR__ . '/../lib/assistant/NgapReference.php';

$pdf = $argv[1] ?? __DIR__ . '/../resources/ngap/ngap.pdf';
if (!is_file($pdf)) {
    fwrite(STDERR, "PDF introuvable : $pdf\n");
    exit(1);
}
$text = str_ends_with($pdf, '.txt')
    ? file_get_contents($pdf)
    : shell_exec('pdftotext -enc UTF-8 -layout ' . escapeshellarg($pdf) . ' -' . (PHP_OS_FAMILY === 'Windows' ? '' : ' 2>/dev/null'));
// Version de repli : date du PDF (2e argument quand le texte vient d'un .txt).
$pdf = $argv[2] ?? $pdf;
if (!is_string($text) || trim($text) === '') {
    fwrite(STDERR, "Texte vide : pdftotext est-il installé ?\n");
    exit(1);
}
$index = NgapReference::buildIndex($text, date('d/m/Y', (int) filemtime($pdf)));
file_put_contents(NgapReference::INDEX, json_encode($index, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
printf("NGAP version %s : %d passages -> %s\n", $index['version'], count($index['chunks']), NgapReference::INDEX);
