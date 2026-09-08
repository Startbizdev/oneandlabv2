<?php
/**
 * Simulation cycle essai Apple → premier débit → renouvellement mensuel.
 * Usage : php backend/scripts/simulate-iap-trial-lifecycle.php
 */
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/lib/AppleIapVerifier.php';
require_once $root . '/lib/SubscriptionDisplay.php';

$now = time();
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

function ms(int $timestamp): int
{
    return $timestamp * 1000;
}

echo "=== Simulation cycle essai → débit Apple Cary Pro ===\n\n";
echo 'Date simulée (référence) : ' . date('Y-m-d H:i:s', $now) . "\n\n";

$iapConfig = [
    'product_id' => 'cary.pro.monthly',
    'plan_slug' => 'nurse_pro',
    'allow_unverified' => false,
    'apple' => ['bundle_id' => 'com.carybioapp.app'],
];
$apple = new AppleIapVerifier($iapConfig);

// --- J0 : souscription avec essai 30 jours ---
$trialEnd = strtotime('+30 days', $now);
$trialPayload = [
    'productId' => 'cary.pro.monthly',
    'originalTransactionId' => '350003487498979',
    'expiresDate' => ms($trialEnd),
    'offerType' => 1,
    'isTrialPeriod' => true,
];
$trialTx = $apple->normalizeTransactionForTest($trialPayload);
assertTrue($trialTx['status'] === 'trialing', 'J0 essai → status trialing');
assertTrue($trialTx['trial_ends_at'] !== null, 'J0 essai → trial_ends_at défini');
assertTrue($trialTx['current_period_end'] === date('Y-m-d H:i:s', $trialEnd), 'J0 essai → fin période = fin essai');

$trialRow = SubscriptionDisplay::enrich([
    'status' => $trialTx['status'],
    'billing_source' => 'apple',
    'trial_ends_at' => $trialTx['trial_ends_at'],
    'current_period_end' => $trialTx['current_period_end'],
], $now);
assertTrue($trialRow['effective_status'] === 'trialing', 'Admin J0 → badge « En essai »');
assertTrue($trialRow['is_trialing'] === true, 'Admin J0 → is_trialing true');

echo "\n--- J0 : infirmier souscrit via App Store (essai 30 j) ---\n";
echo "• Cary enregistre l'abo (POST /iap/apple/verify)\n";
echo "• Débit Cary : aucun — Apple ne prélève pas pendant l'essai\n";
echo "• Carte enregistrée dans le compte Apple de l'utilisateur\n\n";

// --- J+31 : fin essai, Apple débite 29 € ---
$paidPeriodEnd = strtotime('+30 days', $trialEnd);
$renewPayload = [
    'productId' => 'cary.pro.monthly',
    'originalTransactionId' => '350003487498979',
    'expiresDate' => ms($paidPeriodEnd),
    'isTrialPeriod' => false,
];
$renewTx = $apple->normalizeTransactionForTest($renewPayload);
assertTrue($renewTx['status'] === 'active', 'J+31 renouvellement → status active (payant)');
assertTrue($renewTx['trial_ends_at'] === null, 'J+31 renouvellement → trial_ends_at effacé');
assertTrue($renewTx['current_period_end'] === date('Y-m-d H:i:s', $paidPeriodEnd), 'J+31 → nouvelle date de facture');

$renewAt = $trialEnd + 3600;
$renewRow = SubscriptionDisplay::enrich([
    'status' => $renewTx['status'],
    'billing_source' => 'apple',
    'trial_ends_at' => $renewTx['trial_ends_at'],
    'current_period_end' => $renewTx['current_period_end'],
], $renewAt);
assertTrue($renewRow['effective_status'] === 'active', 'Admin J+31 → badge « Actif » (plus en essai)');
assertTrue($renewRow['is_trialing'] === false, 'Admin J+31 → is_trialing false');

echo "--- J+31 : fin d'essai — Apple prélève 29 € automatiquement ---\n";
echo "• Apple envoie webhook DID_RENEW → POST /api/iap/apple/notifications\n";
echo "• Cary met à jour : status=active, trial_ends_at=null, current_period_end=+30j\n";
echo "• L'infirmier garde Cary Pro sans action de sa part\n\n";

// --- Cas Adel (DB périmée au 08/09, essai fini le 02/09) ---
$adelTrialEnd = strtotime('2026-09-02 15:08:50');
$adelStale = SubscriptionDisplay::enrich([
    'status' => 'active',
    'billing_source' => 'apple',
    'trial_ends_at' => '2026-09-02 15:08:50',
    'current_period_end' => '2026-09-02 15:08:50',
], strtotime('2026-09-08 12:00:00'));
assertTrue($adelStale['effective_status'] === 'active', 'Adel 08/09 → plus affiché en essai');
assertTrue($adelStale['is_trialing'] === false, 'Adel 08/09 → is_trialing false');
assertTrue($adelStale['needs_resync'] === true, 'Adel 08/09 → needs_resync (dates périmées)');

// --- Cas Marioune (essai jusqu'au 11/09) ---
$marioune = SubscriptionDisplay::enrich([
    'status' => 'active',
    'billing_source' => 'apple',
    'trial_ends_at' => '2026-09-11 20:23:58',
    'current_period_end' => '2026-09-11 20:23:58',
], strtotime('2026-09-08 12:00:00'));
assertTrue($marioune['effective_status'] === 'trialing', 'Marioune 08/09 → encore en essai');
assertTrue($marioune['is_trialing'] === true, 'Marioune 08/09 → is_trialing true');

// --- Cas Damien Stripe ---
$damien = SubscriptionDisplay::enrich([
    'status' => 'active',
    'billing_source' => 'stripe',
    'trial_ends_at' => '2026-08-12 19:09:50',
    'current_period_end' => null,
], strtotime('2026-09-08 12:00:00'));
assertTrue($damien['effective_status'] === 'active', 'Damien Stripe → actif payant');
assertTrue($damien['is_trialing'] === false, 'Damien → essai terminé (date passée ignorée si pas trialing)');

echo "--- Cas réels simulés au 08/09/2026 ---\n";
echo "• Marioune : EN ESSAI (fin 11/09) — normal\n";
echo "• Adel     : ACTIF mais DB périmée — resync Apple requis\n";
echo "• Damien   : ACTIF Stripe — débité par Stripe depuis le 12/08\n\n";

echo "--- Résultat ---\n";
if ($failures === 0) {
    echo "Tous les tests OK ($failures échec).\n";
    exit(0);
}
echo "$failures test(s) en échec.\n";
exit(1);
