<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiMemoryService.php';
require_once __DIR__ . '/../../lib/ai/AiTurnOrchestrator.php';

final class MultiTurnConversationTest extends TestCase
{
    public function testMemoryOverflowBuildsSummary(): void
    {
        $messages = [];
        for ($i = 1; $i <= 20; $i++) {
            $messages[] = ['role' => $i % 2 === 0 ? 'assistant' : 'user', 'content' => "Tour {$i} pansement demain"];
        }

        $summary = AiMemoryService::buildSummaryTextFromMessages($messages, AiTurnOrchestrator::HISTORY_LIMIT);
        $this->assertNotNull($summary);
        $this->assertStringContainsString('Résumé conversation', $summary);
        $this->assertStringContainsString('Tour 1', $summary);
    }

    public function testShortConversationNoSummary(): void
    {
        $messages = [
            ['role' => 'user', 'content' => 'bonjour'],
            ['role' => 'assistant', 'content' => 'Bonjour !'],
        ];
        $this->assertNull(AiMemoryService::buildSummaryTextFromMessages($messages, 12));
    }
}
