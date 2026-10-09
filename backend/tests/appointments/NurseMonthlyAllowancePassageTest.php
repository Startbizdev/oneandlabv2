<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/NurseMonthlyAllowance.php';

/**
 * Quota mensuel de l'offre Découverte : seuls les rendez-vous acceptés comptent,
 * pas les passages que l'infirmier planifie pour ses propres patients.
 */
final class NurseMonthlyAllowancePassageTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $nurseId = '';
    /** @var list<string> */
    private array $appointmentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->nurseId = TestFixtures::insertProfile($this->db, 'nurse');
    }

    protected function tearDown(): void
    {
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        if ($this->nurseId !== '') {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->nurseId]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testNursePassagesDoNotConsumeTheMonthlyQuota(): void
    {
        $now = new DateTimeImmutable('2026-10-15T12:00:00+02:00');
        $this->confirmedAppointment('2026-10-16 09:00:00', null);
        $this->confirmedAppointment('2026-10-17 09:00:00', 'booking');
        $this->confirmedAppointment('2026-10-16 08:00:00', 'nurse_passage');
        $this->confirmedAppointment('2026-10-17 08:00:00', 'nurse_passage');

        $this->assertSame(2, NurseMonthlyAllowance::count($this->db, $this->nurseId, $now));
    }

    private function confirmedAppointment(string $scheduledAt, ?string $passageSource): void
    {
        $id = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, assigned_nurse_id, passage_source
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, 'nursing', 'confirmed', TestFixtures::PATIENT_A, 'patient', 'nursing', 'fixture-addr', 'fixture-dek',
            $scheduledAt, TestFixtures::PATIENT_A, $this->nurseId, $passageSource,
        ]);
        $this->appointmentIds[] = $id;
    }
}
