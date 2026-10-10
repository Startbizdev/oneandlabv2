<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiConversationScope.php';

final class AiConversationScopeTest extends TestCase
{
    public function testDraftOfAnotherPatientIsRejected(): void
    {
        $draft = ['patient_id' => 'patient-a', 'payload' => []];
        $this->assertFalse(AiConversationScope::draftMatchesPatient($draft, 'patient-b'));
        $this->assertTrue(AiConversationScope::draftMatchesPatient($draft, 'patient-a'));
    }

    public function testGeneralConversationDoesNotInheritAPatientDraft(): void
    {
        $draft = ['patient_id' => '', 'payload' => ['patient_id' => 'patient-a']];
        $this->assertFalse(AiConversationScope::draftMatchesPatient($draft, null));
        $this->assertTrue(AiConversationScope::draftMatchesPatient(['patient_id' => '', 'payload' => []], null));
        $this->assertFalse(AiConversationScope::draftMatchesPatient(
            ['patient_id' => '', 'conversation_id' => 'conv-a', 'payload' => []],
            'patient-b',
            'conv-b',
        ));
    }

    public function testDocumentMustBelongToTheConversationPatient(): void
    {
        $this->assertFalse(AiConversationScope::documentMatchesPatient('patient-b', 'patient-a'));
        $this->assertFalse(AiConversationScope::documentMatchesPatient('patient-b', ''));
        $this->assertTrue(AiConversationScope::documentMatchesPatient('patient-b', 'patient-b'));
        $this->assertFalse(AiConversationScope::documentMatchesPatient(null, 'patient-a'));
    }
}
