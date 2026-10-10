<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/UnifiedRdvValidator.php';

final class UnifiedRdvValidatorSlotTest extends TestCase
{
    public function testHourOutsideCustomWindowIsMissing(): void
    {
        $payload = $this->payload('2026-10-10 20:00:00', [8, 18]);
        $result = UnifiedRdvValidator::validateDraft($payload, 'patient', true);
        $this->assertFalse($result['valid']);
        $this->assertContains('scheduled_at', $result['missing']);
    }

    public function testUtcInstantIsJudgedInParis(): void
    {
        $payload = $this->payload('2026-10-10T11:00:00Z', [8, 12]);
        $result = UnifiedRdvValidator::validateDraft($payload, 'patient', true);
        $this->assertFalse($result['valid']);
        $this->assertContains('scheduled_at', $result['missing']);
    }

    public function testHourInsideCustomWindowIsAccepted(): void
    {
        $payload = $this->payload('2026-10-10 14:30:00', [8, 18]);
        $result = UnifiedRdvValidator::validateDraft($payload, 'patient', true);
        $this->assertTrue($result['valid'], $result['error'] ?? '');
    }

    /**
     * @param array{0: float, 1: float} $range
     * @return array<string, mixed>
     */
    private function payload(string $scheduledAt, array $range): array
    {
        return [
            'type' => 'nursing',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'scheduled_at' => $scheduledAt,
            'availability' => json_encode(['type' => 'custom', 'range' => $range]),
            'address' => ['label' => '12 rue de la Paix, Paris', 'lat' => 48.87, 'lng' => 2.33],
            'patient_mode' => 'self',
        ];
    }
}
