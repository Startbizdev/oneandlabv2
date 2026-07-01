<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiChatHelper.php';

final class AiChatHelperTest extends TestCase
{
    public function testSanitizePreservesParagraphBreaks(): void
    {
        $input = "Bonjour Marie.\n\nValeurs hors normes :\n\n- ALAT 58";
        $out = AiChatHelper::sanitizeVisibleAssistantText($input);
        $this->assertStringContainsString("\n\n", $out);
        $this->assertStringContainsString('Valeurs hors normes', $out);
        $this->assertStringContainsString('- ALAT 58', $out);
    }

    public function testSanitizeDoesNotCollapseNewlinesToSpace(): void
    {
        $input = "Ligne un.\n\nLigne deux.";
        $out = AiChatHelper::sanitizeVisibleAssistantText($input);
        $this->assertSame("Ligne un.\n\nLigne deux.", $out);
    }

    public function testFormatReadableSplitsWallOfText(): void
    {
        $wall = 'Bonjour Marie. Voici votre bilan. ALAT un peu haute. Le reste semble correct. N\'hésitez pas si besoin.';
        $out = AiChatHelper::formatReadableChatText($wall);
        $this->assertGreaterThanOrEqual(1, substr_count($out, "\n\n"));
    }

    public function testFormatReadableSplitsInlineList(): void
    {
        $input = 'Points clés : - ALAT élevée - Ferritine haute';
        $out = AiChatHelper::formatReadableChatText($input);
        $this->assertStringContainsString("\n- ", $out);
    }

    public function testReadabilityWarningsDetectsWall(): void
    {
        $wall = str_repeat('Phrase longue sans retour. ', 20);
        $warnings = AiChatHelper::readabilityWarnings($wall);
        $this->assertNotEmpty($warnings);
    }

    public function testReadabilityWarningsOkForAiredText(): void
    {
        $text = "Bonjour Marie,\n\nValeurs hors normes :\n\n- ALAT 58 UI/L\n\nJe reste dispo.";
        $this->assertSame([], AiChatHelper::readabilityWarnings($text));
    }
}
