<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/Cary360Assertions.php';
require_once __DIR__ . '/../../lib/ai/Cary360ScenarioCatalog.php';
require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';
require_once __DIR__ . '/../../lib/ai/AiDocumentIntent.php';

/**
 * Scénarios 360° déterministes (sans appel Grok) — complète test-cary-360.php.
 */
final class Cary360ScenariosTest extends TestCase
{
    public function testLocalFocusMatrix(): void
    {
        foreach (Cary360Assertions::localFocusScenarios() as $scenario) {
            $got = Cary360Assertions::resolveFocus(
                $scenario['message'],
                $scenario['has_attachment'],
                $scenario['draft'],
                $scenario['has_docs'],
            );
            $this->assertSame(
                $scenario['expect'],
                $got,
                $scenario['id'] . ' — ' . $scenario['message'],
            );
        }
    }

    public function testDocumentFollowUpTraps(): void
    {
        foreach (Cary360Assertions::documentFollowUpTraps() as $trap) {
            $got = CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($trap['message']));
            $this->assertSame($trap['expect'], $got, $trap['id']);
        }
    }

    public function testChatScenarioCatalogFocusPreflight(): void
    {
        foreach (Cary360ScenarioCatalog::chatScenarios() as $scenario) {
            if (!isset($scenario['expect_focus'], $scenario['message'])) {
                continue;
            }
            $hasDocs = (bool) ($scenario['resolve_has_docs'] ?? false);
            $got = Cary360Assertions::resolveFocus((string) $scenario['message'], false, null, $hasDocs);
            $this->assertSame(
                $scenario['expect_focus'],
                $got,
                (string) ($scenario['id'] ?? 'unknown'),
            );
        }
    }

    public function testDocumentScenarioFocusWithHistory(): void
    {
        foreach (Cary360ScenarioCatalog::documentScenarios() as $scenario) {
            $hasAttachment = !empty($scenario['with_attachment']);
            $got = Cary360Assertions::resolveFocus(
                (string) $scenario['message'],
                $hasAttachment,
                null,
                true,
            );
            $this->assertSame($scenario['expect_focus'], $got, (string) ($scenario['id'] ?? ''));
        }
    }

    public function testTextChatForbiddenPatterns(): void
    {
        $bad = "Désolé, je ne vois pas de document joint. Utilisez le bouton +.";
        $errors = Cary360Assertions::validateAssistantText($bad, 5, Cary360Assertions::TEXT_CHAT_FORBIDDEN);
        $this->assertNotEmpty($errors);
        $good = 'Bonjour ! Comment puis-je vous aider pour votre pansement demain ?';
        $this->assertSame([], Cary360Assertions::validateAssistantText($good, 5, Cary360Assertions::TEXT_CHAT_FORBIDDEN));
    }

    public function testIntentTraps(): void
    {
        $bilan = AiDocumentIntent::classify(
            ['document_type' => 'resultats', 'file_name' => 'bilan.pdf', 'mime_type' => 'application/pdf'],
            'ALAT 58 UI/L réf < 45',
        );
        $this->assertSame('medical', $bilan['category']);

        $facture = AiDocumentIntent::classify(
            ['document_type' => 'other', 'file_name' => 'facture.pdf', 'mime_type' => 'application/pdf'],
            'Total TTC facture EDF',
        );
        $this->assertSame('non_medical', $facture['category']);
    }

    public function testApiProbeCatalogNotEmpty(): void
    {
        $this->assertNotEmpty(Cary360ScenarioCatalog::apiProbeEndpoints());
        $this->assertGreaterThanOrEqual(8, count(Cary360ScenarioCatalog::chatScenarios()));
        $this->assertGreaterThanOrEqual(4, count(Cary360ScenarioCatalog::documentScenarios()));
    }
}
