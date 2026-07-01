<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiDocumentIntent.php';

final class AiDocumentIntentTest extends TestCase
{
    public function testResultatsPdfClassifiedAsMedical(): void
    {
        $intent = AiDocumentIntent::classify([
            'document_type' => 'resultats',
            'file_name' => 'bilan_sanguin.pdf',
            'mime_type' => 'application/pdf',
        ], 'Hémoglobine 14 g/dl — Glycémie 0.92 g/l');

        $this->assertSame('medical', $intent['category']);
        $this->assertSame('resultats', $intent['kind']);
    }

    public function testOrdonnanceImageClassifiedAsMedical(): void
    {
        $intent = AiDocumentIntent::classify([
            'document_type' => 'other',
            'file_name' => 'ordonnance_dr_martin.jpg',
            'mime_type' => 'image/jpeg',
        ], 'Prescription Amoxicilline 1g');

        $this->assertSame('medical', $intent['category']);
    }

    public function testCarteVitaleClassifiedAsMedical(): void
    {
        $intent = AiDocumentIntent::classify([
            'document_type' => 'carte_vitale',
            'file_name' => 'carte_vitale.jpg',
            'mime_type' => 'image/jpeg',
        ]);

        $this->assertSame('medical', $intent['category']);
        $this->assertSame('carte_vitale', $intent['kind']);
    }

    public function testInvoiceClassifiedAsNonMedical(): void
    {
        $intent = AiDocumentIntent::classify([
            'document_type' => 'other',
            'file_name' => 'facture_edf.pdf',
            'mime_type' => 'application/pdf',
        ], 'Facture TTC 120 EUR — SIRET 123456789');

        $this->assertSame('non_medical', $intent['category']);
    }

    public function testUnknownPdfWithoutMedicalKeywordsIsUnclearOrNonMedical(): void
    {
        $intent = AiDocumentIntent::classify([
            'document_type' => 'other',
            'file_name' => 'scan001.pdf',
            'mime_type' => 'application/pdf',
        ], '');

        $this->assertContains($intent['category'], ['unclear', 'non_medical']);
    }
}
