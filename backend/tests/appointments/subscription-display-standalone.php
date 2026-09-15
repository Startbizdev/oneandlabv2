<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/SubscriptionService.php';
$service = new SubscriptionService(new PDO('sqlite::memory:'));
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Subscription display regression: ' . ($checks + 1));
    $checks++;
};
$check($service->formatMobileSubscription(null)['plan_slug'] === 'discovery');
foreach (['active', 'trialing'] as $status) {
    $check($service->formatMobileSubscription(['status' => $status, 'plan_slug' => 'nurse_pro', 'billing_source' => 'apple'], 'discovery')['plan_slug'] === 'nurse_pro');
}
foreach (['canceled', 'expired', 'past_due', 'unpaid', 'incomplete'] as $status) {
    $check($service->formatMobileSubscription(['status' => $status, 'plan_slug' => 'nurse_pro', 'billing_source' => 'google'], 'discovery')['plan_slug'] === 'discovery');
}
$check($service->formatMobileSubscription(['status' => 'canceled', 'plan_slug' => 'nurse_pro'], 'nurse_pro')['plan_slug'] === 'nurse_pro');
$check($service->formatMobileSubscription(['status' => 'active', 'billing_source' => 'google'])['manage_hint'] === 'play_store');
echo "$checks assertions passed: active entitlements, expired purchases, alternate active plans and billing management.\n";
