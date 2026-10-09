<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiAssistantResponseGuard.php';
require_once __DIR__ . '/../../lib/ai/AiEmergencyDetector.php';
require_once __DIR__ . '/../../lib/ai/AiStreamMarkerFilter.php';

/**
 * Les nettoyages serveur du texte assistant (marqueurs, flux SSE, fuites internes, mise en forme, garde)
 * ne retirent jamais « appelez le 15 », « 112 » ni « 3114 ».
 */
final class AiEmergencyNumbersPreservedTest extends TestCase
{
    private const NUMBERS = '/\b(?:15|112|3114)\b/u';

    /** @return array<string, array{0: string, 1: list<string>}> */
    public static function answers(): array
    {
        $suicide = AiEmergencyDetector::messageContent(AiEmergencyDetector::response('suicide'));
        $cardiac = AiEmergencyDetector::messageContent(AiEmergencyDetector::response('cardiac'));

        return [
            'urgence fixe suicide' => [$suicide, ['Appelez le 3114', 'le 15 en cas de danger']],
            'urgence fixe cardiaque' => [$cardiac, ['appelez le 15', 'le 15 (SAMU) ou le 112']],
            'marqueurs collés aux numéros' => [
                'Si la douleur revient, appelez le 15 [ref:doc-1]. En Europe, le 112 fonctionne aussi [ref:rag-2]. Idées noires : appelez le 3114[ref:x].',
                ['appelez le 15.', 'le 112 fonctionne aussi.', 'appelez le 3114.'],
            ],
            'markdown et liste' => [
                "**Appelez le 15** sans attendre.\n- Si vous êtes à l'étranger : le 112\n- Détresse psychique : le 3114",
                ['le 112', 'le 3114'],
            ],
            'fuite interne retirée, numéro gardé' => [
                'Appelez le 15 maintenant (booking_step=recap). patient_mode=self Le 112 marche aussi.',
                ['Appelez le 15 maintenant', 'Le 112 marche aussi'],
            ],
        ];
    }

    /**
     * @dataProvider answers
     * @param list<string> $expected
     */
    public function testEveryCleaningStepKeepsTheNumbers(string $answer, array $expected): void
    {
        $numbers = $this->numbers($answer);
        $stripped = AiSourceResolver::stripMarkers($answer);
        $steps = [
            'stripMarkers' => $stripped,
            'sanitize' => AiChatHelper::sanitizeVisibleAssistantText($stripped),
            'format' => AiChatHelper::formatReadableChatText(AiChatHelper::sanitizeVisibleAssistantText($stripped)),
            'stream' => $this->streamed($answer, 3),
            'stream caractère par caractère' => $this->streamed($answer, 1),
        ];
        foreach (['aucun brouillon' => null, 'brouillon en cours' => ['status' => 'collecting', 'payload' => [], 'missing_fields' => ['type']], 'brouillon prêt' => ['status' => 'ready', 'payload' => [], 'missing_fields' => []]] as $label => $draft) {
            $steps['garde ' . $label] = AiAssistantResponseGuard::normalize('Que dois-je faire ?', $stripped, $draft)['text'];
        }

        foreach ($steps as $step => $text) {
            $this->assertSame($numbers, $this->numbers($text), $step);
            $this->assertStringNotContainsString('[ref:', $text, $step);
        }
        foreach ($expected as $fragment) {
            $this->assertStringContainsString($fragment, $steps['stripMarkers']);
        }
    }

    public function testFalseConfirmationRepairKeepsEmergencyGuidance(): void
    {
        $result = AiAssistantResponseGuard::normalize(
            'Confirme mon rendez-vous',
            'Votre rendez-vous est confirmé. Si la douleur devient forte, appelez le 15 ou le 112.',
            null,
        );

        $this->assertSame('false_confirmation', $result['reason']);
        $this->assertStringNotContainsString('est confirmé', $result['text']);
        $this->assertStringContainsString('Si la douleur devient forte, appelez le 15 ou le 112.', $result['text']);
    }

    public function testFalseConfirmationAndGuidanceInOneSentenceKeepsOnlyTheGuidance(): void
    {
        $result = AiAssistantResponseGuard::normalize('Valide le rendez-vous', 'Votre rendez-vous est confirmé, appelez le 3114 si vous allez mal.', null);

        $this->assertStringNotContainsString('confirmé', $result['text']);
        $this->assertStringContainsString('Appelez le 3114 si vous allez mal.', $result['text']);
    }

    public function testRepeatedQuestionRepairKeepsEmergencyGuidance(): void
    {
        $draft = ['status' => 'collecting', 'payload' => ['category_id' => 'nursing', 'category_name' => 'Pansement'], 'missing_fields' => ['scheduled_at']];
        $result = AiAssistantResponseGuard::normalize('demain', 'Quel type de soin ? En cas de malaise, appelez le 15.', $draft);

        $this->assertTrue($result['repaired']);
        $this->assertStringNotContainsString('Quel type de soin', $result['text']);
        $this->assertStringContainsString('En cas de malaise, appelez le 15.', $result['text']);
    }

    public function testLongAnswerReformattedWithoutDuplicatingTheGuidance(): void
    {
        $answer = str_repeat('Votre bilan est globalement rassurant et les valeurs sont proches des normes habituelles. ', 5)
            . '**Appelez le 15** si une douleur thoracique apparaît.';
        $result = AiAssistantResponseGuard::normalize('Que dit mon bilan ?', $answer, null);

        $this->assertSame('readability', $result['reason']);
        $this->assertSame(1, substr_count($result['text'], 'Appelez le 15'));
    }

    public function testDatesAndTimesAreNotMistakenForEmergencyGuidance(): void
    {
        $result = AiAssistantResponseGuard::normalize('Confirme', 'Votre rendez-vous du 15 mars est confirmé. Appelez-moi le 15 mars à 15 h.', null);

        $this->assertSame('false_confirmation', $result['reason']);
        $this->assertDoesNotMatchRegularExpression(self::NUMBERS, $result['text']);
    }

    /** @return list<string> */
    private function numbers(string $text): array
    {
        preg_match_all(self::NUMBERS, $text, $matches);

        return $matches[0];
    }

    private function streamed(string $answer, int $chunk): string
    {
        $out = '';
        $filter = new AiStreamMarkerFilter(static function (string $delta) use (&$out): void {
            $out .= $delta;
        });
        foreach (mb_str_split($answer, $chunk) as $delta) {
            $filter->push($delta);
        }
        $filter->flush();

        return $out;
    }
}
