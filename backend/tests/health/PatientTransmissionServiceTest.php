<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/health/PatientTransmissionService.php';

use PHPUnit\Framework\TestCase;

final class PatientTransmissionServiceTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private PatientTransmissionService $service;
    private string $patientId;
    private string $unlinkedNurseId;
    /** @var list<array{0: string, 1: string, 2: string, 3: string, 4: ?array}> */
    private array $sent = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->sent = [];
        $this->service = new PatientTransmissionService(function (string $userId, string $type, string $title, string $message, ?array $data): string {
            $this->sent[] = [$userId, $type, $title, $message, $data];

            return 'notif-' . count($this->sent);
        }, $this->db);

        $this->patientId = TestFixtures::insertProfile($this->db, 'patient');
        $this->unlinkedNurseId = TestFixtures::insertProfile($this->db, 'nurse');
        $this->grantAccess(TestFixtures::NURSE, $this->patientId);
        $this->grantAccess(TestFixtures::PRO, $this->patientId);
    }

    protected function tearDown(): void
    {
        if (isset($this->db, $this->patientId)) {
            $this->db->prepare('DELETE FROM patient_transmissions WHERE patient_id = ?')->execute([$this->patientId]);
            $placeholders = implode(',', array_fill(0, 2, '?'));
            $this->db->prepare("DELETE FROM profiles WHERE id IN ($placeholders)")
                ->execute([$this->patientId, $this->unlinkedNurseId]);
        }
        unset($this->service, $this->db);
        parent::tearDown();
    }

    public function testCreatedAtIsTheRealInstantWhateverTheSessionTimezone(): void
    {
        $sessionZone = (string) $this->db->query('SELECT @@session.time_zone')->fetchColumn();
        $this->db->exec("SET time_zone = '+05:00'");
        try {
            $created = $this->service->create($this->nurse(), $this->patientId, ['body' => 'Heure exacte']);
        } finally {
            $this->db->prepare('SET time_zone = ?')->execute([$sessionZone]);
        }

        $this->assertEqualsWithDelta(time(), strtotime($created['created_at']), 120);
        $this->assertStringEndsWith(AppTimezone::now()->format('P'), $created['created_at'], 'Heure de Paris');
    }

    public function testLinkedNurseCreatesEncryptedTransmissionAndTeamIsNotified(): void
    {
        $created = $this->service->create($this->nurse(), $this->patientId, [
            'body' => 'Plaie talon gauche propre, pansement refait.',
            'occurred_on' => $this->parisDay('-1 day'),
        ]);

        $this->assertSame('Plaie talon gauche propre, pansement refait.', $created['body']);
        $this->assertSame($this->parisDay('-1 day'), $created['occurred_on']);
        $this->assertSame('nurse', $created['author']['role']);
        $this->assertFalse($created['for_doctor']);
        $this->assertTrue($created['can_edit']);

        $raw = $this->db->prepare('SELECT body_encrypted, body_dek FROM patient_transmissions WHERE id = ?');
        $raw->execute([$created['id']]);
        $row = $raw->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row);
        $this->assertStringNotContainsString('talon', (string) $row['body_encrypted']);
        $this->assertNotSame('', (string) $row['body_dek']);

        $recipients = array_column($this->sent, 0);
        $this->assertContains(TestFixtures::PRO, $recipients);
        $this->assertNotContains(TestFixtures::NURSE, $recipients, 'L\'auteur ne reçoit pas sa propre transmission');
        foreach ($this->sent as [, $type, , $message, $data]) {
            $this->assertSame(PatientTransmissionService::TYPE_TEAM, $type);
            $this->assertStringNotContainsString('talon', $message, 'Le texte médical ne part pas dans la notification');
            $this->assertSame(['patient_id', 'transmission_id', 'occurred_on'], array_keys((array) $data));
        }
    }

    public function testForDoctorNotifiesProWithDedicatedType(): void
    {
        $created = $this->service->create($this->nurse(), $this->patientId, [
            'body' => 'Tension élevée trois jours de suite, avis médical souhaité.',
            'for_doctor' => true,
        ]);

        $this->assertTrue($created['for_doctor']);
        $this->assertSame($this->parisDay('today'), $created['occurred_on']);
        $toPro = array_values(array_filter($this->sent, static fn (array $n): bool => $n[0] === TestFixtures::PRO));
        $this->assertCount(1, $toPro);
        $this->assertSame(PatientTransmissionService::TYPE_FOR_DOCTOR, $toPro[0][1]);
        $this->assertSame($this->patientId, $toPro[0][4]['patient_id']);
        $this->assertSame($created['id'], $toPro[0][4]['transmission_id']);
    }

    public function testUnlinkedNurseIsForbidden(): void
    {
        $unlinked = ['user_id' => $this->unlinkedNurseId, 'role' => 'nurse'];

        $this->assertForbidden(fn () => $this->service->list($unlinked, $this->patientId));
        $this->assertForbidden(fn () => $this->service->create($unlinked, $this->patientId, ['body' => 'x']));
        $this->assertForbidden(fn () => $this->service->careItemsForDate($unlinked, $this->patientId, $this->parisDay('today')));
    }

    public function testPatientIsForbidden(): void
    {
        $this->service->create($this->nurse(), $this->patientId, ['body' => 'Transmission entre soignants']);
        $patient = ['user_id' => $this->patientId, 'role' => 'patient'];

        $this->assertForbidden(fn () => $this->service->list($patient, $this->patientId));
        $this->assertForbidden(fn () => $this->service->create($patient, $this->patientId, ['body' => 'x']));
    }

    public function testFutureDateIsRejectedButPastDateAccepted(): void
    {
        try {
            $this->service->create($this->nurse(), $this->patientId, ['body' => 'Demain', 'occurred_on' => $this->parisDay('+1 day')]);
            $this->fail('Date future acceptée');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('La date ne peut pas être dans le futur', $e->getMessage());
        }

        $past = $this->service->create($this->nurse(), $this->patientId, ['body' => 'Rattrapage', 'occurred_on' => $this->parisDay('-20 days')]);
        $this->assertSame($this->parisDay('-20 days'), $past['occurred_on']);
        $this->assertSame(1, $this->countTransmissions());
    }

    private function countTransmissions(): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM patient_transmissions WHERE patient_id = ?');
        $stmt->execute([$this->patientId]);

        return (int) $stmt->fetchColumn();
    }

    public function testOnlyAuthorEditsAndOnlyWithin24Hours(): void
    {
        $created = $this->service->create($this->nurse(), $this->patientId, ['body' => 'Version 1']);

        $this->assertForbidden(fn () => $this->service->update($this->pro(), $this->patientId, $created['id'], ['body' => 'Par le médecin']));
        $listedByPro = $this->service->list($this->pro(), $this->patientId)['items'];
        $this->assertFalse($listedByPro[0]['can_edit']);

        $updated = $this->service->update($this->nurse(), $this->patientId, $created['id'], ['body' => 'Version 2']);
        $this->assertSame('Version 2', $updated['body']);
        $this->assertNotNull($updated['edited_at']);

        $this->db->prepare('UPDATE patient_transmissions SET created_at = NOW() - INTERVAL 25 HOUR WHERE id = ?')->execute([$created['id']]);
        try {
            $this->service->update($this->nurse(), $this->patientId, $created['id'], ['body' => 'Version 3']);
            $this->fail('Modification acceptée après 24 h');
        } catch (HttpStatusException $e) {
            $this->assertSame(409, $e->httpStatus);
            $this->assertSame('TRANSMISSION_LOCKED', $e->errorCode);
        }
        $this->assertFalse($this->service->list($this->nurse(), $this->patientId)['items'][0]['can_edit']);
    }

    public function testCareItemsAreValidatedAndLabelledServerSide(): void
    {
        $categoryId = health_uuid();
        $this->db->prepare("INSERT INTO care_categories (id, name, type) VALUES (?, 'Pansement simple', 'nursing')")->execute([$categoryId]);
        try {
            $created = $this->service->create($this->nurse(), $this->patientId, [
                'body' => 'Soin fait',
                'care_items' => [['kind' => 'category', 'id' => $categoryId, 'label' => 'Libellé client ignoré']],
            ]);
            $this->assertSame([['kind' => 'category', 'id' => $categoryId, 'label' => 'Pansement simple']], $created['care_items']);

            try {
                $this->service->create($this->nurse(), $this->patientId, [
                    'body' => 'Soin inconnu',
                    'care_items' => [['kind' => 'nursing_item', 'id' => health_uuid()]],
                ]);
                $this->fail('Soin d\'un autre patient accepté');
            } catch (InvalidArgumentException $e) {
                $this->assertSame('Soin inconnu pour ce patient', $e->getMessage());
            }
        } finally {
            $this->db->prepare('DELETE FROM care_categories WHERE id = ?')->execute([$categoryId]);
        }
    }

    public function testListIsPaginatedByDay(): void
    {
        foreach (['-1 day', '-3 days', '-5 days'] as $offset) {
            $this->service->create($this->nurse(), $this->patientId, ['body' => 'Jour ' . $offset, 'occurred_on' => $this->parisDay($offset)]);
        }

        $first = $this->service->list($this->pro(), $this->patientId, null, 2);
        $this->assertSame([$this->parisDay('-1 day'), $this->parisDay('-3 days')], array_column($first['items'], 'occurred_on'));
        $this->assertSame($this->parisDay('-3 days'), $first['next_before']);

        $second = $this->service->list($this->pro(), $this->patientId, $first['next_before'], 2);
        $this->assertSame([$this->parisDay('-5 days')], array_column($second['items'], 'occurred_on'));
        $this->assertNull($second['next_before']);
    }

    /** @return array{user_id: string, role: string} */
    private function nurse(): array
    {
        return ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'];
    }

    /** @return array{user_id: string, role: string} */
    private function pro(): array
    {
        return ['user_id' => TestFixtures::PRO, 'role' => 'pro'];
    }

    private function parisDay(string $modifier): string
    {
        return (new DateTimeImmutable('today', new DateTimeZone('Europe/Paris')))->modify($modifier)->format('Y-m-d');
    }

    private function grantAccess(string $professionalId, string $patientId): void
    {
        $this->db->prepare(
            'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, ?, NULL, NOW())'
        )->execute([health_uuid(), $patientId, $professionalId, 'manual_link']);
    }

    private function assertForbidden(callable $call): void
    {
        try {
            $call();
            $this->fail('Accès attendu refusé');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
    }
}
