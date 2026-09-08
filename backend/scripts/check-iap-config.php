<?php
$c = require '/var/www/oneandlab/backend/config/iap.php';
echo json_encode([
    'issuer' => !empty($c['apple']['issuer_id']),
    'key_id' => !empty($c['apple']['key_id']),
    'private_key' => !empty($c['apple']['private_key']),
    'bundle_id' => $c['apple']['bundle_id'] ?? null,
], JSON_PRETTY_PRINT) . "\n";
