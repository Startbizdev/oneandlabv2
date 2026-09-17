<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiBookingToolExecutor.php';

final class ToolSelectionTest extends TestCase
{
    public function testGeocodeRejectsEmptyQuery(): void
    {
        $executor = new AiBookingToolExecutor(
            ['user_id' => 'u1', 'role' => 'patient'],
            'conv-1',
            null,
        );
        $result = $executor->execute('geocode_address', ['query' => '']);
        $this->assertFalse($result['result']['ok'] ?? true);
        $this->assertArrayHasKey('user_hint_fr', $result['result']);
    }

    public function testDeduplicatesIdenticalToolCall(): void
    {
        $executor = new AiBookingToolExecutor(
            ['user_id' => 'u1', 'role' => 'patient'],
            'conv-1',
            null,
        );
        $first = $executor->execute('confirm_booking', []);
        $second = $executor->execute('confirm_booking', []);
        $this->assertTrue($second['result']['deduplicated'] ?? false);
        $this->assertSame('Information déjà prise en compte.', $second['result']['user_hint_fr'] ?? null);
    }

    public function testUnknownToolReturnsHint(): void
    {
        $executor = new AiBookingToolExecutor(
            ['user_id' => 'u1', 'role' => 'patient'],
            'conv-1',
            null,
        );
        $result = $executor->execute('confirm_booking', []);
        $this->assertArrayHasKey('user_hint_fr', $result['result']);
    }
}
