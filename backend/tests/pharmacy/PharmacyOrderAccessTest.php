<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderAccess.php';

final class PharmacyOrderAccessTest extends TestCase
{
    /** @param array<string, mixed> $overrides */
    private function order(array $overrides = []): array
    {
        return array_merge([
            'id' => 'order-1',
            'requester_id' => 'req-1',
            'pharmacy_id' => 'ph-1',
            'patient_id' => 'pat-1',
            'status' => 'en_attente',
        ], $overrides);
    }

    public function testSuperAdminCanViewAndTransition(): void
    {
        $admin = ['user_id' => 'admin-1', 'role' => 'super_admin'];
        $order = $this->order();

        $this->assertTrue(PharmacyOrderAccess::canView($admin, $order));
        $this->assertTrue(PharmacyOrderAccess::canTransitionPharmacy($admin, $order));
        $this->assertTrue(PharmacyOrderAccess::canTransitionRequester($admin, $order));
    }

    public function testRequesterCanViewAndTransition(): void
    {
        $requester = ['user_id' => 'req-1', 'role' => 'nurse'];
        $order = $this->order();

        $this->assertTrue(PharmacyOrderAccess::canView($requester, $order));
        $this->assertTrue(PharmacyOrderAccess::canTransitionRequester($requester, $order));
        $this->assertFalse(PharmacyOrderAccess::canTransitionPharmacy($requester, $order));
    }

    public function testPharmacyCanViewAndTransition(): void
    {
        $pharmacy = ['user_id' => 'ph-1', 'role' => 'pro'];
        $order = $this->order();

        $this->assertTrue(PharmacyOrderAccess::canView($pharmacy, $order));
        $this->assertTrue(PharmacyOrderAccess::canTransitionPharmacy($pharmacy, $order));
        $this->assertFalse(PharmacyOrderAccess::canTransitionRequester($pharmacy, $order));
    }

    public function testUnrelatedUserCannotView(): void
    {
        $other = ['user_id' => 'other-1', 'role' => 'pro'];
        $this->assertFalse(PharmacyOrderAccess::canView($other, $this->order()));
    }

    public function testCanPostMessageWhenActive(): void
    {
        $requester = ['user_id' => 'req-1', 'role' => 'nurse'];
        $this->assertTrue(PharmacyOrderAccess::canPostMessage($requester, $this->order(['status' => 'en_attente'])));
        $this->assertTrue(PharmacyOrderAccess::canPostMessage($requester, $this->order(['status' => 'acceptee'])));
    }

    public function testCannotPostMessageWhenTerminal(): void
    {
        $requester = ['user_id' => 'req-1', 'role' => 'nurse'];
        foreach (['annulee', 'refusee', 'terminee'] as $status) {
            $this->assertFalse(
                PharmacyOrderAccess::canPostMessage($requester, $this->order(['status' => $status])),
                "Expected canPostMessage=false for status $status"
            );
        }
    }

    public function testCannotPostWhenNoViewAccess(): void
    {
        $other = ['user_id' => 'other-1', 'role' => 'pro'];
        $this->assertFalse(PharmacyOrderAccess::canPostMessage($other, $this->order()));
    }
}
