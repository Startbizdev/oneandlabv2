<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/SubscriptionCheckoutPolicy.php';
$prices = ['nurse_pro' => 'price_nurse', 'lab_starter' => 'price_lab', 'lab_pro' => 'price_lab_pro'];
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Subscription policy regression at check ' . ($checks + 1));
    $checks++;
};
$check(SubscriptionCheckoutPolicy::plan('nurse', 'nurse_pro', '', $prices)['price_id'] === 'price_nurse');
$check(SubscriptionCheckoutPolicy::plan('lab', '', 'price_lab', $prices)['slug'] === 'lab_starter');
foreach ([['nurse', '', 'price_lab'], ['nurse', 'nurse_pro', 'price_lab'], ['patient', 'nurse_pro', ''], ['lab', 'lab_pro', 'price_unknown']] as $input) {
    try {
        SubscriptionCheckoutPolicy::plan(...array_merge($input, [$prices]));
        $check(false);
    } catch (InvalidArgumentException $expected) { $check(true); }
}
$check(SubscriptionCheckoutPolicy::trialDays([]) === 30);
$check(SubscriptionCheckoutPolicy::trialDays([['status' => 'canceled', 'trial_ends_at' => '2026-09-01']]) === 0);
$check(SubscriptionCheckoutPolicy::trialDays([['status' => 'canceled']]) === 0);
$check(SubscriptionCheckoutPolicy::trialDays([['status' => 'incomplete_expired', 'trial_ends_at' => null]]) === 30);
$check(SubscriptionCheckoutPolicy::hasCurrentSubscription([['status' => 'trialing']]));
$check(SubscriptionCheckoutPolicy::hasCurrentSubscription([['status' => 'past_due']]));
$check(!SubscriptionCheckoutPolicy::hasCurrentSubscription([['status' => 'canceled']]));
echo "$checks subscription checks passed\n";
