<?php
require_once __DIR__ . '/../lib/third_party/phpqrcode/phpqrcode.php';
ob_start();
QRcode::png('https://cary.fr/qr/testtoken', false, QR_ECLEVEL_H, 4, 2);
$bytes = ob_get_clean();
echo $bytes === '' ? "FAIL empty\n" : "OK " . strlen($bytes) . " bytes\n";
if ($bytes !== '') {
    echo "PNG header: " . bin2hex(substr($bytes, 0, 4)) . "\n";
}
