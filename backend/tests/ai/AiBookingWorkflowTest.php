<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiBookingWorkflow.php';

final class AiBookingWorkflowTest extends TestCase
{
    public function testOrdonnanceStatusFromPatchNotUserMessage(): void
    {
        $payload = [
            'type' => 'nursing',
            'category_id' => 'cat-1',
            'scheduled_at' => '2026-07-10T10:00:00+02:00',
            'address' => ['label' => '10 rue Test, Marseille'],
            'ordonnance_status' => 'declined',
        ];

        $out = AiBookingWorkflow::apply($payload, 'oui je veux une ordonnance', null);

        $this->assertSame('declined', $out['ordonnance_status']);
        $this->assertSame('recap', $out['booking_step']);
    }

    public function testAllowsRecapWhenOrdonnanceDeclinedInPatch(): void
    {
        $payload = [
            'type' => 'blood_test',
            'ordonnance_status' => 'declined',
        ];

        $this->assertTrue(AiBookingWorkflow::allowsRecap($payload));
    }

    public function testAllowsRecapWhenOrdonnanceDeferred(): void
    {
        $payload = [
            'type' => 'nursing',
            'category_id' => 'c1',
            'scheduled_at' => '2026-07-10T10:00:00+02:00',
            'address' => ['label' => '10 rue Test'],
            'ordonnance_status' => 'deferred',
        ];

        $this->assertTrue(AiBookingWorkflow::allowsRecap($payload));
    }

    public function testStaffPracticeAddressFlagDoesNotRequireMessageRegex(): void
    {
        $payload = [
            'type' => 'nursing',
            'use_staff_practice_address' => true,
            'use_profile_address' => true,
            'address' => ['label' => '55 av Test'],
            'category_id' => 'c1',
            'scheduled_at' => '2026-07-10T10:00:00+02:00',
            'ordonnance_status' => 'not_required',
        ];

        $out = AiBookingWorkflow::apply($payload, null, null);

        $this->assertTrue(AiBookingWorkflow::allowsRecap($out));
    }
}
