<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Garde-fous prompt Cary — pas de diagnostic ni prescription.
 */
final class PromptInjectionGuardTest extends TestCase
{
    public function testSystemPromptContainsSafetyRules(): void
    {
        $source = file_get_contents(__DIR__ . '/../../lib/ai/AIGateway.php');
        $this->assertIsString($source);
        $this->assertStringContainsString("n'établis jamais de diagnostic", $source);
        $this->assertStringContainsString('ne prescris rien', $source);
        $this->assertStringContainsString('booking_patch', $source);
        $this->assertStringContainsString('intent_category', $source);
        $this->assertStringContainsString('chat_attachments', $source);
        $this->assertStringContainsString('PAS de markdown', $source);
        $this->assertStringContainsString('Personnalité (humain, pas robot)', $source);
        $this->assertStringContainsString('startup santé', $source);
        $this->assertStringContainsString('Navigation conversationnelle', $source);
        $this->assertStringContainsString('active_intent', $source);
    }

    public function testTrendEngineDeclaresNonDiagnostic(): void
    {
        $source = file_get_contents(__DIR__ . '/../../lib/ai/TrendEngine.php');
        $this->assertIsString($source);
        $this->assertStringContainsString('jamais diagnostic', $source);
    }

    public function testReportDictationPromptForbidsDiagnosis(): void
    {
        $source = file_get_contents(__DIR__ . '/../../lib/ai/AiReportService.php');
        $this->assertIsString($source);
        $this->assertStringContainsString('SANS diagnostic', $source);
    }
}
