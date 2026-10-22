<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../support/HttpHarness.php';
require_once __DIR__ . '/support/AssistantFixtures.php';
require_once __DIR__ . '/../../lib/assistant/AssistantTools.php';

/**
 * Scénarios de bout en bout par rôle : chaque demande obtient une réponse logique construite sur les vraies données
 * et la seule carte d'action utile (jamais « Prendre RDV » quand on demande la liste, jamais un simple nombre).
 */
final class AssistantScenariosHttpTest extends TestCase
{
    private AssistantFixtures $fixtures;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->fixtures = new AssistantFixtures(TestDatabase::pdo());
        HttpHarness::baseUrl();
        HttpHarness::mockInputs(true);
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        parent::tearDown();
    }

    /** @return array{text: string, actions: list<array<string, mixed>>, statuses: list<string>} */
    private function ask(string $token, string $message): array
    {
        $res = HttpHarness::stream($token, ['message' => $message, 'client_message_id' => Uuid::v4()]);
        $this->assertSame(200, $res['status'], $res['raw']);
        $done = [];
        $statuses = [];
        foreach ($res['events'] as $event) {
            if ($event['event'] === 'done') {
                $done = $event['data'];
            }
            if ($event['event'] === 'status') {
                $statuses[] = $event['data']['text'];
            }
        }

        return ['text' => (string) ($done['text'] ?? ''), 'actions' => $done['actions'] ?? [], 'statuses' => $statuses];
    }

    private function token(string $role): array
    {
        $id = $this->fixtures->profile($role, 'Profil', 'Test');

        return [$id, HttpHarness::token($id, $role)];
    }

    public function testPatientAppointmentListShowsEveryAppointmentWithDayTimeCareAndStatus(): void
    {
        [$patientId, $token] = $this->token('patient');
        $first = $this->fixtures->appointment($patientId, null, 'pending', '+2 days 08:00');
        $this->fixtures->appointment($patientId, null, 'confirmed', '+3 days 14:30');

        $r = $this->ask($token, 'Quels sont mes rendez-vous ?');

        $this->assertStringContainsString('Vous avez 2 rendez-vous à venir', $r['text']);
        $lower = mb_strtolower($r['text']);
        $this->assertStringContainsString(AssistantTools::dayLabel((new DateTimeImmutable('+2 days'))->format('Y-m-d')) . ' à 08:00', $lower);
        $this->assertStringContainsString(AssistantTools::dayLabel((new DateTimeImmutable('+3 days'))->format('Y-m-d')) . ' à 14:30', $lower);
        $this->assertStringContainsString('(En attente)', $r['text']);
        $this->assertStringContainsString('(Confirmé)', $r['text']);
        $this->assertStringNotContainsString('élément', $r['text'], 'Jamais un simple décompte');
        $this->assertSame([['type' => 'open_appointment', 'label' => 'Voir le prochain rendez-vous', 'params' => ['id' => $first]]], $r['actions']);
        $this->assertSame(['Je consulte vos rendez-vous…'], $r['statuses'], 'Pas de statut technique pour la carte');
    }

    public function testPatientWithoutAppointmentIsToldSoAndOfferedToBook(): void
    {
        [, $token] = $this->token('patient');
        $r = $this->ask($token, 'Quels sont mes rendez-vous ?');

        $this->assertStringStartsWith('Vous n\'avez aucun rendez-vous à venir', $r['text']);
        $this->assertSame('book_appointment', $r['actions'][0]['type'] ?? null);
    }

    public function testPastAppointmentsWithoutHistoryOffersNothing(): void
    {
        [, $token] = $this->token('patient');
        $r = $this->ask($token, 'Quels sont mes derniers rendez-vous passés ?');

        $this->assertSame('Vous n\'avez pas encore de rendez-vous passé.', $r['text']);
        $this->assertSame([], $r['actions']);
    }

    public function testBookingRequestOpensBookingWithTheRightCareTypeWithoutListing(): void
    {
        [, $token] = $this->token('patient');

        $blood = $this->ask($token, 'Je voudrais prendre un rendez-vous pour une prise de sang');
        $this->assertSame([['type' => 'book_appointment', 'label' => 'Prendre rendez-vous', 'params' => ['care_type' => 'blood_test']]], $blood['actions']);
        $this->assertStringContainsString('prise de sang', $blood['text']);
        $this->assertSame([], $blood['statuses'], 'Aucune consultation inutile');

        $nursing = $this->ask($token, 'Je veux un rdv infirmier pour un pansement');
        $this->assertSame(['care_type' => 'nursing'], $nursing['actions'][0]['params'] ?? null);
    }

    public function testResultsWithoutDocumentsAreExplained(): void
    {
        [, $token] = $this->token('patient');
        $r = $this->ask($token, 'Mes résultats d\'analyses ?');

        $this->assertStringStartsWith('Aucun résultat d\'analyse n\'est disponible', $r['text']);
        $this->assertSame('open_lab_results', $r['actions'][0]['type'] ?? null);
    }

    public function testGreetingIsRoleAware(): void
    {
        [, $patient] = $this->token('patient');
        [, $nurse] = $this->token('nurse');

        $this->assertStringContainsString('prochains rendez-vous', $this->ask($patient, 'Bonjour')['text']);
        $this->assertStringContainsString('tournée', $this->ask($nurse, 'Bonjour')['text']);
    }

    public function testNurseWithoutAppointmentIsNotOfferedToBookForHerself(): void
    {
        [, $token] = $this->token('nurse');
        $r = $this->ask($token, 'Quels sont mes rendez-vous ?');

        $this->assertSame('Vous n\'avez aucun rendez-vous à venir pour le moment.', $r['text']);
        $this->assertSame([], $r['actions']);
    }

    public function testDayLabelGivesTheRightWeekdayAroundTheClockChange(): void
    {
        $this->assertSame('vendredi 23 octobre 2026', AssistantTools::dayLabel('2026-10-23 00:30:00'));
        $this->assertSame('dimanche 25 octobre 2026', AssistantTools::dayLabel('2026-10-25 23:30:00'));
        $this->assertSame('samedi 1 août 2026', AssistantTools::dayLabel('2026-08-01'));
        $this->assertNull(AssistantTools::dayLabel(null));
    }
}
