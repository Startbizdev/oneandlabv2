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
            'voice/sessions/index.php',
            'voice/sessions/[id]/turn.php',
            'voice/sessions/[id]/end.php',
            'search/index.php',
            'export/index.php',
            'trends/index.php',
            'feedback/index.php',
            'reports/dictate.php',
            'reports/[id]/validate.php',
            'reports/[id]/publish.php',
        ];
        foreach ($required as $rel) {
            $this->assertFileExists($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel), $rel);
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
