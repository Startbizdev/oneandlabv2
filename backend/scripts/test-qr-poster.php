<?php
require_once __DIR__ . '/../lib/QrPosterRenderer.php';
$renderer = new QrPosterRenderer();
try {
    $png = $renderer->renderRawQrPng('https://cary.fr/qr/testtoken', 200);
    echo 'OK ' . strlen($png) . " bytes\n";
} catch (Throwable $e) {
    echo 'FAIL ' . $e->getMessage() . "\n";
}
