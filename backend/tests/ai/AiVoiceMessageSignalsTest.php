<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiVoiceMessageSignals.php';
require_once __DIR__ . '/../../lib/ai/AiVoiceAssistantGuard.php';
require_once __DIR__ . '/../../lib/ai/AiVoiceDraftReconciler.php';

final class AiVoiceMessageSignalsTest extends TestCase
{
    public function testParseCareHintFromPansement(): void
    {
        $patch = AiVoiceMessageSignals::buildDraftPatch('Un pansement pour Alessandro', ['role' => 'nurse'], null);
        $this->assertSame('pansement', $patch['category_name'] ?? null);
        $this->assertSame('nursing', $patch['type'] ?? null);
    }

    public function testParseStaffContactFlags(): void
    {
        $patch = AiVoiceMessageSignals::buildDraftPatch(
            'Pas de mail, utilise mon numéro',
            ['role' => 'nurse'],
            null,
        );
        $this->assertTrue($patch['use_staff_contact_email'] ?? false);
        $this->assertTrue($patch['use_staff_contact_phone'] ?? false);
    }

    public function testParseEmailFromMessage(): void
    {
        $patch = AiVoiceMessageSignals::buildDraftPatch(
            'alessandroturco@hotmail.fr',
            ['role' => 'nurse'],
            null,
        );
        $this->assertSame('alessandroturco@hotmail.fr', $patch['email'] ?? null);
    }

    public function testGuardSkipsRepeatedCareQuestionWhenCategoryKnown(): void
    {
        $draft = [
            'status' => 'collecting',
            'missing_fields' => ['scheduled_at', 'availability', 'address'],
            'payload' => [
                'category_id' => '8cd3ac87-1a34-11f1-af39-0eb6988ed0bd',
                'category_name' => 'Pansement-plaie',
                'scheduled_at' => '2026-07-07',
                'form_data' => ['first_name' => 'Alessandro'],
            ],
        ];
        $out = AiVoiceAssistantGuard::normalize(
            'Un pansement aujourd\'hui',
            'Quel soin pour Alessandro aujourd\'hui ?',
            $draft,
        );
        $this->assertSame('À quelle heure ?', $out);
    }

    public function testOrdonnanceDeclinedOnNon(): void
    {
        $payload = [
            'type' => 'nursing',
            'category_id' => 'x',
            'scheduled_at' => '2026-07-07 14:00:00',
            'address' => ['label' => 'Rue de Rome', 'lat' => 1.0, 'lng' => 2.0],
            'booking_step' => 'documents',
            'ordonnance_status' => 'pending',
        ];
        $patch = AiVoiceDraftReconciler::buildPatch($payload, 'Non.', ['role' => 'nurse']);
        $this->assertSame('declined', $patch['ordonnance_status'] ?? null);
        $this->assertSame('recap', $patch['booking_step'] ?? null);
    }

    public function testStaffContactMessageSkipsIdentityParse(): void
    {
        $patch = AiVoiceMessageSignals::buildDraftPatch(
            'pas de mail pas de tel',
            ['role' => 'nurse'],
            null,
        );
        $this->assertTrue($patch['use_staff_contact_email'] ?? false);
        $this->assertTrue($patch['use_staff_contact_phone'] ?? false);
        $this->assertArrayNotHasKey('first_name', $patch);
        $this->assertArrayNotHasKey('last_name', $patch);
    }
}
