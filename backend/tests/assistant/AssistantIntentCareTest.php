<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/AssistantIntent.php';

/** Soin proposé d'après le besoin décrit, sur le catalogue réel (nom + description). */
final class AssistantIntentCareTest extends TestCase
{
    /** @return iterable<string, array{0: string, 1: string, 2: string, 3: bool}> */
    public static function cases(): iterable
    {
        yield 'plaie → pansement' => ['Pansement-plaie', 'Pansements selon prescription infirmière.', 'J\'ai une plaie au genou, il faut la soigner', true];
        yield 'diabétique → suivi diabète' => ['Suivi diabète', 'Suivi glycémique et éducation thérapeutique.', 'Je suis diabétique, j\'ai besoin d\'un suivi', true];
        yield 'vaccin → vaccination' => ['Vaccination', 'Vaccins administrés selon calendrier vaccinal.', 'Je voudrais me faire vacciner contre la grippe', true];
        yield 'prise de sang → bilan sanguin' => ['Bilan sanguin', 'Panel biologique selon prescription.', 'Je voudrais une prise de sang mardi', true];
        yield 'enceinte → grossesse' => ['Grossesse', 'Bêta-HCG et bilans liés à grossesse.', 'Je pense être enceinte', true];
        yield 'agrafes → retrait' => ['Retrait de points / agrafes', 'Retrait fils ou agrafes si cicatrisation OK.', 'Il faut m\'enlever les agrafes', true];
        yield 'prise de sang ne choisit pas le bilan complet' => ['Bilan complet', 'Bilan biologique complet.', 'Je voudrais une prise de sang mardi', false];
        yield 'prise de sang ne choisit pas un pansement' => ['Pansement-plaie', 'Pansements selon prescription infirmière.', 'Je voudrais une prise de sang', false];
        yield 'demande vague' => ['Injection', 'Injections IM et SC sur prescription médicale.', 'Je voudrais un rendez-vous', false];
    }

    public function testBookingIntentFromNeedAndMomentButNotQuestionsAboutExistingAppointments(): void
    {
        foreach (['J\'ai une plaie au genou, il faudrait passer demain matin', 'Je suis diabétique et j\'aimerais un suivi à domicile la semaine prochaine', 'Je voudrais me faire vacciner contre la grippe jeudi', 'Je voudrais une prise de sang mardi vers 8h'] as $q) {
            $this->assertTrue(AssistantIntent::wantsBooking($q), $q);
        }
        foreach (['Quand est mon prochain rendez-vous ?', 'Quels sont mes rendez-vous demain ?', 'Résume mes résultats de lundi', 'Comment mieux dormir ?'] as $q) {
            $this->assertFalse(AssistantIntent::wantsBooking($q), $q);
        }
    }

    /** @dataProvider cases */
    public function testCareMatchesTheDescribedNeed(string $name, string $description, string $question, bool $expected): void
    {
        $this->assertSame($expected, AssistantIntent::careMatches($name, $description, $question));
    }
}
