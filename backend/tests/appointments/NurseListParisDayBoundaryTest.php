<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../lib/AppTimezone.php';

/**
 * Onglets infirmier : la journée commence à minuit heure de Paris (scheduled_at stocké en heure de Paris).
 * Un passage d'hier à 23h30 est dans l'historique, celui d'aujourd'hui à 00h30 dans les acceptés.
 */
final class NurseListParisDayBoundaryTest extends TestCase
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
        unset($_GET['nurse_segment']);
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        if ($this->nurseId !== '') {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->nurseId]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testParisMidnightSplitsAcceptedAndHistory(): void
    {
        $today = AppTimezone::now()->setTime(0, 30);
        $yesterdayLate = AppTimezone::now()->modify('-1 day')->setTime(23, 30);
        $todayId = $this->assignedPassage(AppTimezone::sqlDateTime($today));
        $yesterdayId = $this->assignedPassage(AppTimezone::sqlDateTime($yesterdayLate));

        $accepted = $this->segmentIds('acceptes');
        $history = $this->segmentIds('historique');

        $this->assertContains($todayId, $accepted);
        $this->assertNotContains($yesterdayId, $accepted);
        $this->assertContains($yesterdayId, $history);
        $this->assertNotContains($todayId, $history);
    }

    public function testUpcomingPeriodListsSoonestFirstWithoutPast(): void
    {
        $nextWeekId = $this->assignedPassage(AppTimezone::sqlDateTime(AppTimezone::now()->modify('+7 days')->setTime(8, 0)));
        $tomorrowId = $this->assignedPassage(AppTimezone::sqlDateTime(AppTimezone::now()->modify('+1 day')->setTime(8, 0)));
        $yesterdayId = $this->assignedPassage(AppTimezone::sqlDateTime(AppTimezone::now()->modify('-1 day')->setTime(8, 0)));

        $upcoming = $this->segmentIds('tous', 'upcoming');
        $past = $this->segmentIds('historique', 'past');

        $this->assertNotContains($yesterdayId, $upcoming);
        $this->assertLessThan(array_search($nextWeekId, $upcoming, true), array_search($tomorrowId, $upcoming, true));
        $this->assertContains($yesterdayId, $past);
        $this->assertNotContains($tomorrowId, $past);
    }

    /** @return list<string> */
    private function segmentIds(string $segment, ?string $period = null): array
    {
        $_GET['nurse_segment'] = $segment;
        $flags = AppointmentListQueryBuilder::schemaFlags($this->db);
        $get = ['scope' => 'list', 'limit' => '50'];
        if ($period !== null) {
            $get['patient_period'] = $period;
        }
        $builder = new AppointmentListQueryBuilder(
            $this->db,
            AppointmentListQuery::fromArray($get),
            ['user_id' => $this->nurseId, 'role' => 'nurse'],
            $flags['useRelativeJoin'],
            $flags['hasMergedColumn'],
        );
        $sql = $builder->build();
        [$orderBy, $orderParams] = $builder->buildOrderByClause();
        $stmt = $this->db->prepare($sql->selectSql . $orderBy);
        $stmt->execute(array_merge($sql->params, $orderParams));

        return array_map('strval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id'));
    }

    private function assignedPassage(string $scheduledAt): string
    {
        $id = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, assigned_nurse_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, ?, ?, ?)'
        )->execute([
            $id, 'nursing', 'confirmed', TestFixtures::PATIENT_A, 'patient', 'nursing', 'fixture-addr', 'fixture-dek',
            $scheduledAt, TestFixtures::PATIENT_A, $this->nurseId,
        ]);
        $this->appointmentIds[] = $id;

        return $id;
    }
}
