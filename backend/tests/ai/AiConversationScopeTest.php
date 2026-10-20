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

    public function testPatientGeneralConversationIsAboutThePatient(): void
    {
        $user = ['user_id' => 'patient-a', 'role' => 'patient'];
        $scope = AiConversationScope::conversationPatientId(['user_id' => 'patient-a', 'patient_id' => null], $user);

        $this->assertSame('patient-a', $scope);
        $this->assertTrue(AiConversationScope::documentMatchesPatient($scope, 'patient-a'));
        $this->assertFalse(AiConversationScope::documentMatchesPatient($scope, 'patient-b'));
    }

    public function testExplicitConversationDossierWins(): void
    {
        $user = ['user_id' => 'patient-a', 'role' => 'patient'];

        $this->assertSame(
            'relative-dossier',
            AiConversationScope::conversationPatientId(['user_id' => 'patient-a', 'patient_id' => 'relative-dossier'], $user),
        );
    }

    public function testStaffConversationWithoutPatientTakesNoPatientDocument(): void
    {
        $user = ['user_id' => 'nurse-1', 'role' => 'nurse'];
        $scope = AiConversationScope::conversationPatientId(['user_id' => 'nurse-1', 'patient_id' => null], $user);

        $this->assertNull($scope);
        $this->assertFalse(AiConversationScope::documentMatchesPatient($scope, 'patient-a'));
    }

    public function testAnotherUsersConversationIsNotScopedToTheViewer(): void
    {
        $user = ['user_id' => 'patient-a', 'role' => 'patient'];

        $this->assertNull(AiConversationScope::conversationPatientId(['user_id' => 'patient-b', 'patient_id' => null], $user));
    }
}
