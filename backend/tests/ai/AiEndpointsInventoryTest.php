<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Inventaire minimal des endpoints IA Phase 4 (non-régression fichiers).
 */
final class AiEndpointsInventoryTest extends TestCase
{
    public function testPhase4ApiFilesExist(): void
    {
        $root = realpath(__DIR__ . '/../../api/ai');
        $this->assertIsString($root);
        $required = [
            'chat.php',
            'chat/stream.php',
            'conversations/index.php',
            'conversations/[id].php',
            'conversations/[id]/attachments.php',
            'conversations/ensure-system.php',
            'documents/[id]/analyze.php',
            'booking/drafts/index.php',
            'booking/drafts/[id].php',
            'booking/drafts/[id]/confirm.php',
            'quick-suggestions.php',
            'voice/sessions/index.php',
            'voice/realtime/index.php',
            'voice/sessions/[id]/turn.php',
            'voice/sessions/[id]/end.php',
            'voice/sessions/[id]/tool.php',
            'voice/sessions/[id]/events.php',
            'search/index.php',
            'export/index.php',
            'feedback/index.php',
            'reports/dictate.php',
            'reports/[id].php',
            'reports/[id]/validate.php',
            'reports/[id]/publish.php',
        ];
        foreach ($required as $rel) {
            $this->assertFileExists($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel), $rel);
        }
    }

    public function testRemovedAssistantSurfacesStayDeleted(): void
    {
        $root = realpath(__DIR__ . '/../..');
        $this->assertIsString($root);
        foreach ([
            'api/ai/hub.php',
            'api/ai/signals/index.php',
            'api/ai/signals/[id]/act.php',
            'api/ai/signals/[id]/dismiss.php',
            'api/ai/trends/index.php',
            'api/ai/documents/[id]/summary.php',
            'lib/ai/OpenAIProvider.php',
            'lib/ai/DeepSeekProvider.php',
        ] as $rel) {
            $this->assertFileDoesNotExist($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel), $rel);
        }
    }

    public function testGrokToolArchitectureFilesExist(): void
    {
        $lib = realpath(__DIR__ . '/../../lib/ai');
        $this->assertIsString($lib);
        foreach ([
            'AiTurnOrchestrator.php',
            'AiBookingToolExecutor.php',
            'AiGrokToolCatalog.php',
            'AiBookingDraftSummary.php',
        ] as $file) {
            $this->assertFileExists($lib . DIRECTORY_SEPARATOR . $file, $file);
        }
        $this->assertFileDoesNotExist($lib . DIRECTORY_SEPARATOR . 'AiAddressQueryExtractor.php');
        $this->assertFileDoesNotExist($lib . DIRECTORY_SEPARATOR . 'AiVoiceTranscriptNormalizer.php');
    }
}
