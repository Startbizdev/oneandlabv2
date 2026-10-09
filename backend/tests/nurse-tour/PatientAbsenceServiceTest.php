<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/nurse-tour/PatientAbsenceService.php';

use PHPUnit\Framework\TestCase;

/**
 * Absence patient sans date de fin (« jusqu'à nouvel ordre ») : création, chevauchement, absence active, clôture.
 */
final class PatientAbsenceServiceTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private PatientAbsenceService $service;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->service = new PatientAbsenceService($this->db);
        $this->db->prepare('DELETE FROM patient_absences WHERE nurse_id = ? AND patient_id = ?')
            ->execute([TestFixtures::NURSE, TestFixtures::PATIENT_A]);
        $this->db->prepare(
            'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, ?, NULL, NOW())'
        )->execute([
            sprintf('00000000-0000-4000-8000-%012x', random_int(0, 0xffffffff)),
            TestFixtures::PATIENT_A,
            TestFixtures::NURSE,
            'manual_link',
        ]);
    }

    protected function tearDown(): void
    {
        unset($this->service, $this->db);
        parent::tearDown();
    }

    public function testOpenEndedAbsenceIsActiveUntilFurtherNoticeThenClosedToday(): void
    {
        $start = (new DateTimeImmutable('-3 days'))->format('Y-m-d');
        $today = (new DateTimeImmutable('today'))->format('Y-m-d');
        $farFuture = (new DateTimeImmutable('+400 days'))->format('Y-m-d');

        $absence = $this->create(['absence_type' => 'hospitalization', 'start_date' => $start]);

        $this->assertNull($absence['end_date']);
        $this->assertSame('Hospitalisé · jusqu\'à nouvel ordre', $absence['card_label_fr']);

        $active = $this->service->listForPatient(TestFixtures::NURSE, TestFixtures::PATIENT_A, true);
        $this->assertSame([$absence['id']], array_column($active, 'id'));

        $map = $this->service->activeMapForDate(TestFixtures::NURSE, [TestFixtures::PATIENT_A], $farFuture);
        $this->assertSame($absence['id'], $map[TestFixtures::PATIENT_A]['id'] ?? null);

        $closed = $this->service->update(TestFixtures::NURSE, TestFixtures::PATIENT_A, $absence['id'], ['end_date' => $today]);
        $this->assertSame($today, $closed['end_date']);
        $this->assertSame($start, $closed['start_date']);
        $this->assertSame([], $this->service->activeMapForDate(TestFixtures::NURSE, [TestFixtures::PATIENT_A], $farFuture));
    }

    public function testOpenEndedAbsenceBlocksAnyLaterAbsence(): void
    {
        $this->create([
            'absence_type' => 'hospitalization',
            'start_date' => (new DateTimeImmutable('today'))->format('Y-m-d'),
            'end_date' => null,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Une absence existe déjà sur cette période pour ce patient');

        $this->create([
            'absence_type' => 'leave',
            'start_date' => (new DateTimeImmutable('+200 days'))->format('Y-m-d'),
            'end_date' => (new DateTimeImmutable('+210 days'))->format('Y-m-d'),
        ]);
    }

    public function testEndedAbsenceBeforeOpenEndedOneDoesNotOverlap(): void
    {
        $this->create([
            'absence_type' => 'leave',
            'start_date' => (new DateTimeImmutable('-10 days'))->format('Y-m-d'),
            'end_date' => (new DateTimeImmutable('-5 days'))->format('Y-m-d'),
        ]);
        $open = $this->create([
            'absence_type' => 'other',
            'start_date' => (new DateTimeImmutable('-2 days'))->format('Y-m-d'),
        ]);

        $active = $this->service->listForPatient(TestFixtures::NURSE, TestFixtures::PATIENT_A, true);
        $this->assertSame([$open['id']], array_column($active, 'id'));
    }

    public function testEndBeforeStartIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('La date de fin doit être après la date de début');

        $this->create(['absence_type' => 'leave', 'start_date' => '2026-05-10', 'end_date' => '2026-05-09']);
    }

    public function testInvalidDateIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Date invalide');

        $this->create(['absence_type' => 'leave', 'start_date' => '2026-02-30']);
    }

    public function testMissingStartDateIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Date de début requise');

        $this->create(['absence_type' => 'leave', 'start_date' => '']);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function create(array $input): array
    {
        return $this->service->create(TestFixtures::NURSE, TestFixtures::PATIENT_A, TestFixtures::NURSE, $input);
    }
}
