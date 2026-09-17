<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';

final class VoiceRealtimeContextTest extends TestCase
{
    public function testIntentRecalculatedFromTranscriptNotEmptyMessage(): void
    {
        $empty = CaryContextFocus::resolve('', false, null, false);
        $booking = CaryContextFocus::resolve('pansement demain 14h', false, null, false);
        $this->assertSame(CaryContextFocus::GENERAL, $empty);
        $this->assertSame(CaryContextFocus::BOOKING, $booking);
    }

    public function testDraftActiveOverridesGeneralTranscript(): void
    {
        $focus = CaryContextFocus::resolve('oui demain', false, ['status' => 'collecting'], true);
        $this->assertSame(CaryContextFocus::BOOKING, $focus);
    }
}
