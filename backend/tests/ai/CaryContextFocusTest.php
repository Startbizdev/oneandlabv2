<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';

final class CaryContextFocusTest extends TestCase
{
    public function testAttachmentForcesDocumentFocus(): void
    {
        $this->assertSame(
            CaryContextFocus::DOCUMENT,
            CaryContextFocus::resolve('bonjour', true, null),
        );
    }

    public function testCarnetMessageUsesGeneralFocus(): void
    {
        $this->assertSame(
            CaryContextFocus::GENERAL,
            CaryContextFocus::resolve('Aide-moi à compléter mon carnet de santé', false, null),
        );
    }

    public function testPlainQuestionDoesNotTriggerDocumentFollowUp(): void
    {
        $this->assertFalse(CaryContextFocus::matchesDocumentFollowUp('bonjour comment vas tu ?'));
        $this->assertFalse(CaryContextFocus::matchesDocumentFollowUp('merci beaucoup'));
        $this->assertFalse(CaryContextFocus::matchesDocumentFollowUp('je voudrais un pansement demain'));
    }

    public function testAlatFollowUpDetected(): void
    {
        $this->assertTrue(CaryContextFocus::matchesDocumentFollowUp('explique moi mieux l alat'));
    }

    public function testPansementUsesGeneralFocusGrokToolsHandleBooking(): void
    {
        $this->assertSame(
            CaryContextFocus::GENERAL,
            CaryContextFocus::resolve('Je voudrais un pansement demain', false, null),
        );
    }

    public function testActiveDraftIsBooking(): void
    {
        $this->assertSame(
            CaryContextFocus::BOOKING,
            CaryContextFocus::resolve('oui demain', false, ['status' => 'collecting']),
        );
    }

    public function testGeneralQuestion(): void
    {
        $this->assertSame(
            CaryContextFocus::GENERAL,
            CaryContextFocus::resolve('Quelle est la différence entre ALAT et ASAT ?', false, null),
        );
    }
}
