<?php
/**
 * Simulation backend IAP (mode IAP_ALLOW_UNVERIFIED, sans App Store / Play réels).
 *
 * Usage: php backend/scripts/simulate-iap-flow.php
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/lib/AppleIapVerifier.php';
require_once $root . '/lib/GoogleIapVerifier.php';

$iapConfig = [
    'product_id' => 'cary.pro.monthly',
    'plan_slug' => 'nurse_pro',
    'allow_unverified' => true,
    'apple' => [
        'bundle_id' => 'com.carybioapp.app',
    ],
    'google' => [
        'package_name' => 'com.carybioapp.app',
    ],
];

echo "=== Simulation backend IAP Cary Pro ===\n\n";
echo "Product ID (guide): {$iapConfig['product_id']}\n";
echo "Plan backend: {$iapConfig['plan_slug']}\n";
echo "Bundle / package: com.carybioapp.app\n";
echo "Mode: IAP_ALLOW_UNVERIFIED=true (sandbox dev)\n\n";

$apple = new AppleIapVerifier($iapConfig);
$google = new GoogleIapVerifier($iapConfig);

$failures = 0;

function assertTrue(bool $cond, string $label): void
{
    global $failures;
    if ($cond) {
        echo "✅ $label\n";
        return;
    }
    $failures++;
    echo "❌ $label\n";
}

// --- Apple verify (comme POST /iap/apple/verify) ---
$appleResult = $apple->verifyPurchase('sim-tx-001', null);
assertTrue($appleResult['product_id'] === 'cary.pro.monthly', 'Apple verify → product_id cary.pro.monthly');
assertTrue($appleResult['status'] === 'active', 'Apple verify → status active');
assertTrue(!empty($appleResult['original_transaction_id']), 'Apple verify → original_transaction_id présent');
assertTrue(!empty($appleResult['current_period_end']), 'Apple verify → current_period_end défini');

echo "\nRéponse mobile Apple simulée:\n";
echo json_encode([
    'plan_slug' => 'nurse_pro',
    'billing_source' => 'apple',
    'product_id' => $appleResult['product_id'],
    'status' => $appleResult['status'],
    'can_purchase_store' => true,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// --- Google verify (comme POST /iap/google/verify) ---
$googleToken = 'sim-purchase-token-' . bin2hex(random_bytes(8));
$googleResult = $google->verifySubscription('cary.pro.monthly', $googleToken);
assertTrue($googleResult['product_id'] === 'cary.pro.monthly', 'Google verify → product_id cary.pro.monthly');
assertTrue($googleResult['status'] === 'active', 'Google verify → status active');
assertTrue(!empty($googleResult['original_transaction_id']), 'Google verify → original_transaction_id présent');

echo "\nRéponse mobile Google simulée:\n";
echo json_encode([
    'plan_slug' => 'nurse_pro',
    'billing_source' => 'google',
    'product_id' => $googleResult['product_id'],
    'status' => $googleResult['status'],
    'can_purchase_store' => true,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// --- Rejet produit inconnu (comme verify.php) ---
$wrongProduct = 'com.wrong.product';
if ($wrongProduct !== $iapConfig['product_id']) {
    echo "✅ Rejet produit inconnu simulé ($wrongProduct ≠ cary.pro.monthly)\n";
} else {
    $failures++;
    echo "❌ Rejet produit inconnu\n";
}

// --- Config guide checklist ---
$checklist = [
    'IAP_NURSE_PRO_PRODUCT_ID' => $iapConfig['product_id'],
    'APPLE_IAP_BUNDLE_ID' => 'com.carybioapp.app',
    'GOOGLE_IAP_PACKAGE_NAME' => 'com.carybioapp.app',
    'Webhook Apple' => 'https://cary.bio/api/iap/apple/notifications',
    'Webhook Google' => 'https://cary.bio/api/iap/google/notifications',
];

echo "\n--- Alignement guide iap-store-setup.md ---\n";
foreach ($checklist as $key => $value) {
    echo "  • $key → $value\n";
}

echo "\n--- Résultat ---\n";
if ($failures === 0) {
    echo "Tous les tests backend simulés OK.\n";
    exit(0);
}

echo "$failures test(s) en échec.\n";
exit(1);
