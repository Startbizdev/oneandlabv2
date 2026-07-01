<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/rag/LabResultAnalysisPrompt.php';

final class LabResultAnalysisPromptTest extends TestCase
{
    public function testDetectsLabResultDocumentType(): void
    {
        $this->assertTrue(LabResultAnalysisPrompt::isLabDocument(
            ['document_type' => 'resultats', 'file_name' => 'doc.pdf'],
            'other',
        ));
    }

    public function testLabPromptRequiresLineByLineCheck(): void
    {
        $msg = LabResultAnalysisPrompt::buildUserMessage('bilan.pdf', 'Résultats d\'analyse', 'ALAT 58');
        $this->assertStringContainsString('Valeurs hors normes', $msg);
        $this->assertStringContainsString('NE TE FIE PAS', $msg);
        $this->assertStringNotContainsString('**', $msg);
    }

    public function testVisionPromptComparesReferences(): void
    {
        $msg = LabResultAnalysisPrompt::buildVisionInstruction('Résultats d\'analyse', 'bilan.pdf', 'pdf');
        $this->assertStringContainsString('hors normes', $msg);
        $this->assertStringContainsString('ALAT 58', $msg);
    }
}
