<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/AssistantIntent.php';

final class AssistantIntentSlotTest extends TestCase
{
    /** @return iterable<string, array{0: string, 1: array<string, string>}> */
    public static function questions(): iterable
    {
        // Vendredi 30 octobre 2026.
        yield 'jour de la semaine et heure' => ['Je voudrais une prise de sang mardi prochain vers 8h', ['date' => '2026-11-03', 'time_from' => '8', 'time_to' => '10']];
        yield 'demain matin' => ['un rdv demain matin', ['date' => '2026-10-31', 'time_from' => '8', 'time_to' => '10']];
        yield 'date en toutes lettres' => ['prendre rendez-vous le 3 novembre à 14 h 30', ['date' => '2026-11-03', 'time_from' => '14', 'time_to' => '16']];
        yield 'date numérique, après-midi' => ['réserver une prise de sang le 12/11 l\'après-midi', ['date' => '2026-11-12', 'time_from' => '14', 'time_to' => '16']];
        yield 'même jour de semaine : la semaine suivante' => ['besoin d\'un pansement vendredi', ['date' => '2026-11-06']];
        yield 'date passée : l\'an prochain' => ['un rendez-vous le 2 janvier', ['date' => '2027-01-02']];
        yield 'heure trop tôt ramenée aux horaires de passage' => ['prise de sang demain à 5h', ['date' => '2026-10-31', 'time_from' => '7', 'time_to' => '9']];
        yield 'rien de précis' => ['je veux un rdv', []];
    }

    /** @dataProvider questions */
    public function testSlotFromQuestion(string $question, array $expected): void
    {
        $this->assertSame($expected, AssistantIntent::slot($question, new DateTimeImmutable('2026-10-30 15:00', new DateTimeZone('Europe/Paris'))));
    }
}
