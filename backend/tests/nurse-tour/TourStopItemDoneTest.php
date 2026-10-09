<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';
require_once __DIR__ . '/../../lib/nurse-tour/NurseTourService.php';
require_once __DIR__ . '/../../lib/nurse-tour/TourVisitService.php';

/** Soins cochés un par un en tournée : tous cochés → passage effectué ; un soin décoché → passage à refaire. */
final class TourStopItemDoneTest extends TestCase
{
    use SkipsWithoutPdo;

    private const TOUR_DATE = '2030-01-08';

    private PDO $db;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = NursePassageFixtures::create($this->db);
    }

    protected function tearDown(): void
    {
        if ($this->fixtures !== null) {
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testCheckingEveryCareMarksTheStopDoneAndUncheckingReopensIt(): void
    {
        $stop = $this->tourStop();
        [$first, $second] = array_column($stop['nursing_items'], 'id');
        $visits = new TourVisitService($this->db);
        $nurse = $this->fixtures['nurse'];

        $tour = $visits->setItemDone($nurse, $stop['stop_id'], $first, true);
        $this->assertSame('todo', $this->stopIn($tour, $stop['stop_id'])['visit_status']);
        $this->assertNotNull($this->stopIn($tour, $stop['stop_id'])['nursing_items'][0]['done_at']);

        $tour = $visits->setItemDone($nurse, $stop['stop_id'], $second, true);
        $this->assertSame('done', $this->stopIn($tour, $stop['stop_id'])['visit_status']);

        $tour = $visits->setItemDone($nurse, $stop['stop_id'], $first, false);
        $reopened = $this->stopIn($tour, $stop['stop_id']);
        $this->assertSame('todo', $reopened['visit_status']);
        $this->assertNull($reopened['nursing_items'][0]['done_at']);
        $this->assertNotNull($reopened['nursing_items'][1]['done_at']);
        $this->assertSame('confirmed', $reopened['status']);
    }

    public function testCareOfAnotherPassageIsRejected(): void
    {
        $stop = $this->tourStop();

        $this->expectException(HttpStatusException::class);
        $this->expectExceptionMessage('Soin introuvable');
        (new TourVisitService($this->db))->setItemDone($this->fixtures['nurse'], $stop['stop_id'], NursePassageFixtures::uuid(), true);
    }

    public function testAnotherNurseCannotCheckTheCare(): void
    {
        $stop = $this->tourStop();
        $otherNurse = TestFixtures::insertProfile($this->db, 'nurse');

        try {
            (new TourVisitService($this->db))->setItemDone($otherNurse, $stop['stop_id'], $stop['nursing_items'][0]['id'], true);
            $this->fail('Un autre infirmier ne doit pas accéder au passage');
        } catch (HttpStatusException $e) {
            $this->assertSame('Stop introuvable', $e->getMessage());
        } finally {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$otherNurse]);
        }
    }

    /** @return array<string, mixed> */
    private function tourStop(): array
    {
        (new NursePassageSeriesService($this->db))->create($this->fixtures['nurse'], [
            'patient_id' => $this->fixtures['patient'],
            'planning_type' => 'single_day',
            'planning_config' => ['start_date' => self::TOUR_DATE],
            'time_slot' => 'morning',
            'duration_minutes' => 20,
            'at_home' => true,
            'nursing_items' => [
                ['category_id' => $this->fixtures['category'], 'care_options' => ['site' => 'bras']],
                ['category_id' => $this->fixtures['category'], 'care_options' => ['site' => 'cuisse']],
            ],
        ], new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone('Europe/Paris')));
        $tour = (new NurseTourService($this->db))->getTour($this->fixtures['nurse'], self::TOUR_DATE);
        $this->assertCount(1, $tour['stops']);
        $this->assertCount(2, $tour['stops'][0]['nursing_items']);

        return $tour['stops'][0];
    }

    /**
     * @param array<string, mixed> $tour
     * @return array<string, mixed>
     */
    private function stopIn(array $tour, string $stopId): array
    {
        foreach ($tour['stops'] as $stop) {
            if ($stop['stop_id'] === $stopId) {
                return $stop;
            }
        }
        $this->fail('Stop absent de la tournée');
    }
}
