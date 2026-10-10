<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiBookingDraftSummary.php';

final class AiBookingDraftSummaryTest extends TestCase
{
    public function testPromptSummaryOmitsRawPayloadAndIdentifiers(): void
    {
        $summary = AiBookingDraftSummary::forPrompt([
            'id' => '11111111-1111-4111-8111-111111111111',
            'status' => 'collecting',
            'missing_fields' => [],
            'payload' => [
                'patient_id' => '22222222-2222-4222-8222-222222222222',
                'email' => 'marie@example.com',
                'phone' => '0600000000',
                'first_name' => 'Marie',
                'last_name' => 'Martin',
                'booking_step' => 'slot',
            ],
        ]);

        $encoded = json_encode($summary);
        $this->assertIsString($encoded);
        $this->assertStringNotContainsString('marie@example.com', $encoded);
        $this->assertStringNotContainsString('0600000000', $encoded);
        $this->assertStringNotContainsString('22222222', $encoded);
        $this->assertArrayNotHasKey('id', $summary);
        $this->assertSame('Marie Martin', $summary['patient_name']);
    }
}
