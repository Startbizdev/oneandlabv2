<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiQuickSuggestionsService.php';

/**
 * Suggestions du hub Cary : jamais de prise de rendez-vous pour un rôle exclu
 * d’AiBookingAccess, et un libellé professionnel hors patient.
 */
final class AiQuickSuggestionsServiceTest extends TestCase
{
    public function testPreleveurGetsNoBookingNorPatientWording(): void
    {
        $ids = $this->suggestionIds(['user_id' => 'prel-unknown', 'role' => 'preleveur']);

        $this->assertNotContains('book', $ids);
        $this->assertNotContains('patient_rdv', $ids);
        $this->assertNotContains('general', $ids);
        $this->assertContains('case_question', $ids);
    }

    public function testProKeepsPatientBookingSuggestion(): void
    {
        $ids = $this->suggestionIds(['user_id' => 'pro-unknown', 'role' => 'pro']);

        $this->assertContains('patient_rdv', $ids);
        $this->assertContains('case_question', $ids);
        $this->assertNotContains('book', $ids);
    }

    public function testStaffResultsAndDocumentsUseProfessionalWording(): void
    {
        $ctx = [
            'appointments' => ['upcoming' => []],
            'lab_results' => [['id' => 'lr-1']],
            'documents' => [['id' => 'doc-1']],
        ];
        $items = (new AiQuickSuggestionsService())->suggestionsFromContext(
            ['user_id' => 'pro-unknown', 'role' => 'pro'],
            $ctx,
        );
        $ids = array_map(static fn (array $item): string => $item['id'], $items);

        $this->assertContains('patient_lab_results', $ids);
        $this->assertContains('patient_docs', $ids);
        $this->assertNotContains('lab_results', $ids);
        $this->assertNotContains('analyze_docs', $ids);
    }

    /** @return list<string> */
    private function suggestionIds(array $user): array
    {
        $items = (new AiQuickSuggestionsService())->suggestionsForUser($user);

        return array_map(static fn (array $item): string => $item['id'], $items);
    }
}
