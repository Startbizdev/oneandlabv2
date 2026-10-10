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

    public function testCarnetMessageUsesHealthRecordFocus(): void
    {
        $this->assertSame(
            CaryContextFocus::HEALTH_RECORD,
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

    public function testPansementUsesBookingFocus(): void
    {
        $this->assertSame(
            CaryContextFocus::BOOKING,
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

    public function testAgendaQuestionIsNotABooking(): void
    {
        $this->assertTrue(CaryContextFocus::isAgendaQuestion("j'ai rdv quoi demain"));
        $this->assertFalse(CaryContextFocus::matchesBookingRequest("j'ai rdv quoi demain"));
        $this->assertSame(
            CaryContextFocus::GENERAL,
            CaryContextFocus::resolve("j'ai rdv quoi demain", false, null),
        );
        $this->assertSame('2026-10-10', CaryContextFocus::agendaDay("j'ai rdv quoi demain", '2026-10-09', '2026-10-10'));
    }

    public function testCreateRequestStaysBooking(): void
    {
        $this->assertFalse(CaryContextFocus::isAgendaQuestion('Je voudrais un pansement demain'));
        $this->assertTrue(CaryContextFocus::matchesBookingRequest('Je voudrais prendre un rdv demain'));
        $this->assertSame(
            CaryContextFocus::BOOKING,
            CaryContextFocus::resolve('rdv prise de sang demain matin', false, null),
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
