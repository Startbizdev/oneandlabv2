<?php

/**
 * Configuration Stripe (abonnements infirmiers / laboratoires).
 * Variables d'environnement : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 * STRIPE_PRICE_NURSE_PRO, STRIPE_PRICE_LAB_STARTER, STRIPE_PRICE_LAB_PRO.
 */

$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile) && !getenv('STRIPE_SECRET_KEY')) {
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $key = trim($name);
            $val = trim($value);
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

return [
    'secret_key' => $_ENV['STRIPE_SECRET_KEY'] ?? '',
    'webhook_secret' => $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '',
    'prices' => [
        'nurse_pro' => $_ENV['STRIPE_PRICE_NURSE_PRO'] ?? '',
        'lab_starter' => $_ENV['STRIPE_PRICE_LAB_STARTER'] ?? '',
        'lab_pro' => $_ENV['STRIPE_PRICE_LAB_PRO'] ?? '',
    ],
];
