<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';

/**
 * first_date / last_date d'une série : scheduled_at est déjà l'heure de Paris, aucune conversion de fuseau.
 */
final class NursePassageSeriesDatesTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $seriesId = '';
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
    }

    protected function tearDown(): void
    {
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        if ($this->seriesId !== '') {
            $this->db->prepare('DELETE FROM nurse_passage_series WHERE id = ?')->execute([$this->seriesId]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testLateEveningPassageKeepsItsParisDate(): void
    {
        $this->seriesId = $this->uuid();
        $this->db->prepare(
            "INSERT INTO nurse_passage_series (id, nurse_id, patient_id, planning_type, planning_config, nursing_items)
             VALUES (?, ?, ?, 'custom_dates', '{}', '[]')"
        )->execute([$this->seriesId, TestFixtures::NURSE, TestFixtures::PATIENT_A]);
        $this->passage('2026-10-15 23:30:00');
        $this->passage('2026-10-20 23:45:00');

        $series = (new NursePassageSeriesService($this->db))->getById($this->seriesId, TestFixtures::NURSE);

        $this->assertNotNull($series);
        $this->assertSame('2026-10-15', $series['first_date']);
        $this->assertSame('2026-10-20', $series['last_date']);
    }

    private function passage(string $scheduledAt): void
    {
        $id = $this->uuid();
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, assigned_nurse_id, passage_series_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, 'nursing', 'confirmed', TestFixtures::NURSE, 'nurse', 'nursing', 'fixture-addr', 'fixture-dek',
            $scheduledAt, TestFixtures::PATIENT_A, TestFixtures::NURSE, $this->seriesId,
        ]);
        $this->appointmentIds[] = $id;
    }

    private function uuid(): string
    {
        return strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
    }
}
