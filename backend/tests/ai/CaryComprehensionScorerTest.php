<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/CaryComprehensionScorer.php';
require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';

final class CaryComprehensionScorerTest extends TestCase
{
    public function testHighScoreWhenIntentAndTextMatch(): void
    {
        $scenario = [
            'expect_focus' => CaryContextFocus::BOOKING,
            'forbidden' => [],
            'min_length' => 5,
        ];
        $result = [
            'focus' => CaryContextFocus::BOOKING,
            'assistant_text' => 'Parfait, je note le pansement pour demain.',
            'tool_calls' => [],
        ];
        $score = CaryComprehensionScorer::scoreTurn($scenario, $result);
        $this->assertGreaterThanOrEqual(85, $score);
    }

    public function testLowScoreWhenIntentWrong(): void
    {
        $scenario = ['expect_focus' => CaryContextFocus::BOOKING];
        $result = [
            'focus' => CaryContextFocus::GENERAL,
            'assistant_text' => 'Bonjour.',
            'tool_calls' => ['update_booking_draft'],
        ];
        $scenario['expect_tools'] = ['update_booking_draft'];
        $score = CaryComprehensionScorer::scoreTurn($scenario, $result);
        $this->assertLessThan(75, $score);
    }
}
