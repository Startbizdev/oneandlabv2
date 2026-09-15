<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/SubscriptionManagement.php';
require_once __DIR__ . '/../../lib/SubscriptionService.php';
$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE subscriptions (id TEXT PRIMARY KEY, user_id TEXT, status TEXT, billing_source TEXT, stripe_customer_id TEXT, plan_slug TEXT, updated_at TEXT)');
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Subscription management regression: ' . ($checks + 1));
    $checks++;
};
$insert = static function (string $id, string $status, ?string $source, ?string $customer, string $date, string $user = 'patient') use ($db): void {
    $db->prepare('INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$id, $user, $status, $source, $customer, 'nurse_pro', $date]);
};
$check(SubscriptionManagement::find($db, 'patient') === null);
$insert('current', 'active', 'stripe', 'customer-current', '2026-08-01');
$insert('historical', 'canceled', 'stripe', 'customer-old', '2026-09-10');
$check(SubscriptionManagement::find($db, 'patient')['id'] === 'current');
$check(SubscriptionManagement::find($db, 'patient', true)['stripe_customer_id'] === 'customer-current');
$insert('trial', 'trialing', 'apple', null, '2026-09-01');
$check(SubscriptionManagement::find($db, 'patient')['billing_source'] === 'apple');
$check(SubscriptionManagement::find($db, 'patient', true)['id'] === 'current');
$service = new SubscriptionService($db);
$check($service->formatMobileSubscription($service->getSubscriptionForManagement('patient'))['manage_hint'] === 'ios_settings');
$db->exec("UPDATE subscriptions SET status='canceled' WHERE id IN ('trial', 'current')");
$insert('needs-action', 'past_due', 'stripe', 'customer-action', '2026-08-15');
$check(SubscriptionManagement::find($db, 'patient')['id'] === 'needs-action');
$db->exec("UPDATE subscriptions SET status='canceled' WHERE id='needs-action'");
$check(SubscriptionManagement::find($db, 'patient')['id'] === 'historical');
$insert('other-user', 'active', 'google', null, '2026-09-15', 'other');
$check(SubscriptionManagement::find($db, 'patient')['id'] === 'historical');
$insert('legacy', 'active', null, 'legacy-customer', '2026-09-14');
$check(SubscriptionManagement::find($db, 'patient', true)['stripe_customer_id'] === 'legacy-customer');
$insert('empty-customer', 'active', 'stripe', '', '2026-09-15');
$check(SubscriptionManagement::find($db, 'patient', true)['id'] === 'legacy');
echo "$checks assertions passed: active subscription priority, source-specific billing, payment recovery, historical fallback and account isolation.\n";
