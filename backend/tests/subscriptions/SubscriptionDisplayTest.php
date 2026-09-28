<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/SubscriptionService.php';

/**
 * Format abonnement mobile (IAP / Stripe display) — SQLite in-memory.
 */
final class SubscriptionDisplayTest extends TestCase
{
    private SubscriptionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SubscriptionService(new PDO('sqlite::memory:'));
    }

    public function testNullSubscriptionDefaultsToDiscovery(): void
    {
        $this->assertSame('discovery', $this->service->formatMobileSubscription(null)['plan_slug']);
    }

    public function testActiveAndTrialingKeepNursePro(): void
    {
        foreach (['active', 'trialing'] as $status) {
            $fmt = $this->service->formatMobileSubscription(
                ['status' => $status, 'plan_slug' => 'nurse_pro', 'billing_source' => 'apple'],
                'discovery'
            );
            $this->assertSame('nurse_pro', $fmt['plan_slug'], $status);
        }
    }

    public function testInactiveStatusesFallBackToDiscovery(): void
    {
        foreach (['canceled', 'expired', 'past_due', 'unpaid', 'incomplete'] as $status) {
            $fmt = $this->service->formatMobileSubscription(
                ['status' => $status, 'plan_slug' => 'nurse_pro', 'billing_source' => 'google'],
                'discovery'
            );
            $this->assertSame('discovery', $fmt['plan_slug'], $status);
        }
    }

    public function testCanceledKeepsAlternateActivePlanHint(): void
    {
        $fmt = $this->service->formatMobileSubscription(
            ['status' => 'canceled', 'plan_slug' => 'nurse_pro'],
            'nurse_pro'
        );
        $this->assertSame('nurse_pro', $fmt['plan_slug']);
    }

    public function testGoogleBillingManageHint(): void
    {
        $fmt = $this->service->formatMobileSubscription(
            ['status' => 'active', 'billing_source' => 'google']
        );
        $this->assertSame('play_store', $fmt['manage_hint']);
    }
}
