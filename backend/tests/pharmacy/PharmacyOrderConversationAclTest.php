<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderConversation.php';

final class PharmacyOrderConversationAclTest extends TestCase
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

    public function testRequesterCanAccessConversation(): void
    {
        $this->assertTrue(PharmacyOrderConversation::canAccess(
            ['user_id' => 'req-1', 'role' => 'nurse'],
            $this->order()
        ));
    }

    public function testPharmacyCanAccessConversation(): void
    {
        $this->assertTrue(PharmacyOrderConversation::canAccess(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $this->order()
        ));
    }

    public function testUnrelatedUserCannotAccessConversation(): void
    {
        $this->assertFalse(PharmacyOrderConversation::canAccess(
            ['user_id' => 'other-1', 'role' => 'pro'],
            $this->order()
        ));
    }

    public function testCanPostWhileOrderActive(): void
    {
        $this->assertTrue(PharmacyOrderConversation::canPost(
            ['user_id' => 'req-1', 'role' => 'nurse'],
            $this->order(['status' => 'complement_demande'])
        ));
    }

    public function testCannotPostWhenCanceled(): void
    {
        $this->assertFalse(PharmacyOrderConversation::canPost(
            ['user_id' => 'req-1', 'role' => 'nurse'],
            $this->order(['status' => 'annulee'])
        ));
    }

    public function testCannotPostWhenRefused(): void
    {
        $this->assertFalse(PharmacyOrderConversation::canPost(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $this->order(['status' => 'refusee'])
        ));
    }

    public function testCanStillReadWhenCompleted(): void
    {
        $this->assertTrue(PharmacyOrderConversation::canAccess(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $this->order(['status' => 'terminee'])
        ));
        $this->assertFalse(PharmacyOrderConversation::canPost(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $this->order(['status' => 'terminee'])
        ));
    }
}
