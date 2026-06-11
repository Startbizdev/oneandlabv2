<?php

/**
 * Configuration IAP (Apple App Store + Google Play).
 * Voir docs/iap-store-setup.md
 */

$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') === false) {
                continue;
            }
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $val;
                putenv("$key=$val");
            }
        }
    }
}

$appleKeyPath = $_ENV['APPLE_IAP_PRIVATE_KEY_PATH'] ?? '';
$appleKeyContent = $_ENV['APPLE_IAP_PRIVATE_KEY'] ?? '';
if (!$appleKeyContent && $appleKeyPath && file_exists($appleKeyPath)) {
    $appleKeyContent = file_get_contents($appleKeyPath) ?: '';
}

$googleJsonPath = $_ENV['GOOGLE_IAP_SERVICE_ACCOUNT_PATH'] ?? ($_ENV['GOOGLE_IAP_SERVICE_ACCOUNT_JSON'] ?? '');
$googleServiceAccount = null;
if ($googleJsonPath && file_exists($googleJsonPath)) {
    $googleServiceAccount = json_decode(file_get_contents($googleJsonPath), true);
} elseif (!empty($_ENV['GOOGLE_IAP_SERVICE_ACCOUNT_JSON']) && strpos($_ENV['GOOGLE_IAP_SERVICE_ACCOUNT_JSON'], '{') === 0) {
    $googleServiceAccount = json_decode($_ENV['GOOGLE_IAP_SERVICE_ACCOUNT_JSON'], true);
}

return [
    'product_id' => $_ENV['IAP_NURSE_PRO_PRODUCT_ID'] ?? 'cary.pro.monthly',
    'plan_slug' => 'nurse_pro',
    'allow_unverified' => filter_var($_ENV['IAP_ALLOW_UNVERIFIED'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
    'apple' => [
        'issuer_id' => $_ENV['APPLE_IAP_ISSUER_ID'] ?? '',
        'key_id' => $_ENV['APPLE_IAP_KEY_ID'] ?? '',
        'private_key' => $appleKeyContent,
        'bundle_id' => $_ENV['APPLE_IAP_BUNDLE_ID'] ?? 'com.carybioapp.app',
        'environment' => $_ENV['APPLE_IAP_ENVIRONMENT'] ?? 'production',
    ],
    'google' => [
        'package_name' => $_ENV['GOOGLE_IAP_PACKAGE_NAME'] ?? 'com.carybioapp.app',
        'service_account' => is_array($googleServiceAccount) ? $googleServiceAccount : null,
    ],
];
