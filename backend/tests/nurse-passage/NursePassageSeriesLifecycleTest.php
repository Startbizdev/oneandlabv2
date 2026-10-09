<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';

/**
 * Cycle de vie d'une série de passages : création, modification sans doublon, suppression d'un passage,
 * retrait d'un créneau, suppression de la série, fenêtre glissante et rejeu idempotent.
 */
final class NursePassageSeriesLifecycleTest extends TestCase
{
    use SkipsWithoutPdo;

    private const TZ = 'Europe/Paris';

    private PDO $db;
    private NursePassageSeriesService $service;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;
    private string $nurseId = '';
    private string $patientId = '';
    private string $categoryId = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = NursePassageFixtures::create($this->db);
        $this->nurseId = $this->fixtures['nurse'];
        $this->patientId = $this->fixtures['patient'];
        $this->categoryId = $this->fixtures['category'];
        $this->service = new NursePassageSeriesService($this->db);
    }

    protected function tearDown(): void
    {
        if ($this->fixtures !== null) {
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
        }
        unset($this->service, $this->db);
        parent::tearDown();
    }

    public function testChronicSeriesWithThreeDailySlotsCreatesOnePassagePerDayAndSlot(): void
    {
        $result = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'));

        $this->assertSame(9, $result['created_appointments']);
        $this->assertSame([
            '2030-01-07 08:00:00', '2030-01-07 12:30:00', '2030-01-07 19:00:00',
            '2030-01-08 08:00:00', '2030-01-08 12:30:00', '2030-01-08 19:00:00',
            '2030-01-09 08:00:00', '2030-01-09 12:30:00', '2030-01-09 19:00:00',
        ], array_column($this->active($result['series_id']), 'scheduled_at'));
        $config = $result['series']['planning_config'];
        $this->assertArrayHasKey('materialized_until', $config);
        $this->assertSame('2030-03-07', $config['materialized_until']);
    }

    public function testContentEditUpdatesFuturePassagesInPlaceWithoutDuplicates(): void
    {
        $seriesId = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'))['series_id'];
        $idsBefore = array_column($this->active($seriesId), 'id');

        $result = $this->service->update($seriesId, $this->nurseId, [
            'notes' => 'Glycémie avant injection',
            'duration_minutes' => 25,
        ], $this->parisTime('2030-01-07 06:30'));

        $this->assertSame(0, $result['created_appointments']);
        $this->assertSame(0, $result['canceled_appointments']);
        $this->assertSame(9, $result['updated_appointments']);
        $this->assertSame($idsBefore, array_column($this->active($seriesId), 'id'));
        $materializer = new PassageMaterializer($this->db);
        foreach ($materializer->loadActiveAppointments($seriesId, $this->nurseId, '2030-01-07') as $apt) {
            $this->assertSame('Glycémie avant injection', $apt['form_data']['notes']);
            $this->assertSame(25, $apt['form_data']['passage_duration_minutes']);
        }
    }

    public function testScheduleEditOnlyReplacesChangedSlots(): void
    {
        $seriesId = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'))['series_id'];
        $kept = array_column(
            array_filter($this->active($seriesId), static fn (array $a): bool => !str_ends_with($a['scheduled_at'], '19:00:00')),
            'id',
        );

        $config = $this->chronicInput()['planning_config'];
        $config['daily_time_slots'][2] = ['time_slot' => 'night', 'custom_time' => '21:15'];
        $result = $this->service->update($seriesId, $this->nurseId, ['planning_config' => $config], $this->parisTime('2030-01-07 06:30'));

        $this->assertSame(3, $result['created_appointments']);
        $this->assertSame(3, $result['canceled_appointments']);
        $active = $this->active($seriesId);
        $this->assertCount(9, $active);
        $this->assertSame(9, count(array_unique(array_column($active, 'scheduled_at'))));
        $this->assertSame([], array_diff($kept, array_column($active, 'id')));
        $this->assertCount(3, array_filter($active, static fn (array $a): bool => str_ends_with($a['scheduled_at'], '21:15:00')));
    }

    public function testDeletedPassageIsNeverRecreated(): void
    {
        $seriesId = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'))['series_id'];
        $target = $this->activeAt($seriesId, '2030-01-08 12:30:00');

        $this->service->cancelOccurrence($seriesId, $this->nurseId, $target, $this->parisTime('2030-01-07 07:00'));
        $this->assertSame(0, $this->service->materialize($seriesId, $this->nurseId, $this->parisTime('2030-01-07 07:00'))['created_appointments']);
        $config = $this->chronicInput()['planning_config'];
        $config['daily_time_slots'][] = ['time_slot' => 'night', 'custom_time' => '22:00'];
        $this->service->update($seriesId, $this->nurseId, ['planning_config' => $config], $this->parisTime('2030-01-07 07:00'));

        $scheduled = array_column($this->active($seriesId), 'scheduled_at');
        $this->assertNotContains('2030-01-08 12:30:00', $scheduled);
        $this->assertCount(11, $scheduled);
        $series = $this->service->getById($seriesId, $this->nurseId);
        $this->assertSame(['2030-01-08|custom@12:30'], $series['planning_config']['excluded_occurrences']);
    }

    public function testRemoveSlotCancelsOnlyThatSlotAndUpdatesTheSeries(): void
    {
        $seriesId = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'))['series_id'];

        $result = $this->service->removeSlot(
            $seriesId,
            $this->nurseId,
            $this->activeAt($seriesId, '2030-01-08 12:30:00'),
            $this->parisTime('2030-01-07 06:30'),
        );

        $this->assertSame(3, $result['canceled_appointments']);
        $this->assertSame(
            [['time_slot' => 'custom', 'custom_time' => '08:00'], ['time_slot' => 'custom', 'custom_time' => '19:00']],
            $result['series']['planning_config']['daily_time_slots'],
        );
        $this->assertCount(0, array_filter(
            $this->active($seriesId),
            static fn (array $a): bool => str_ends_with($a['scheduled_at'], '12:30:00'),
        ));
        $this->assertCount(6, $this->active($seriesId));
    }

    public function testRemovingTheLastSlotIsRefused(): void
    {
        $input = $this->chronicInput();
        $input['planning_config']['daily_time_slots'] = [['time_slot' => 'morning', 'custom_time' => null]];
        $input['time_slot'] = 'morning';
        $input['custom_time'] = null;
        $seriesId = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'))['series_id'];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Dernier créneau de la série');
        $this->service->removeSlot($seriesId, $this->nurseId, $this->activeAt($seriesId, '2030-01-08 08:00:00'), $this->parisTime('2030-01-07 06:30'));
    }

    public function testDeletingTheSeriesCancelsTodaysPassagesButKeepsThePast(): void
    {
        $seriesId = $this->service->create($this->nurseId, $this->chronicInput(), $this->parisTime('2030-01-07 06:00'))['series_id'];

        $canceled = $this->service->delete($seriesId, $this->nurseId, $this->parisTime('2030-01-08 20:00'));

        $this->assertSame(6, $canceled);
        $this->assertNull($this->service->getById($seriesId, $this->nurseId));
        $remaining = $this->db->prepare(
            "SELECT scheduled_at FROM appointments WHERE assigned_nurse_id = ? AND status = 'confirmed' ORDER BY scheduled_at"
        );
        $remaining->execute([$this->nurseId]);
        $this->assertSame(
            ['2030-01-07 08:00:00', '2030-01-07 12:30:00', '2030-01-07 19:00:00'],
            $remaining->fetchAll(PDO::FETCH_COLUMN),
        );
    }

    public function testAllDaySlotIsStoredAndPlannedWithoutTime(): void
    {
        $input = $this->chronicInput();
        $input['planning_config']['daily_time_slots'] = [['time_slot' => 'all_day', 'custom_time' => '10:00']];

        $result = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));

        $this->assertSame('all_day', $result['series']['time_slot']);
        $this->assertNull($result['series']['custom_time']);
        $this->assertSame(3, $result['created_appointments']);
        $apt = (new PassageMaterializer($this->db))->loadActiveAppointments($result['series_id'], $this->nurseId, '2030-01-07')[0];
        $this->assertSame('2030-01-07|all_day', $apt['key']);
        $this->assertSame('{"type":"all_day"}', $apt['form_data']['availability']);
        $this->assertSame('all_day', $apt['form_data']['availability_type']);
    }

    public function testAllDayCannotBeCombinedWithOtherSlots(): void
    {
        $input = $this->chronicInput();
        $input['planning_config']['daily_time_slots'][] = ['time_slot' => 'all_day', 'custom_time' => null];

        $this->expectException(InvalidArgumentException::class);
        $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));
    }

    public function testExactTimeMustBeHourMinute(): void
    {
        $input = $this->chronicInput();
        $input['planning_config']['daily_time_slots'][0]['custom_time'] = '25:00';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Heure invalide');
        $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));
    }

    public function testReplayingTheSameRequestReturnsTheSameSeriesWithoutDuplicates(): void
    {
        $input = $this->chronicInput() + ['client_request_id' => 'qa-replay-' . bin2hex(random_bytes(6))];

        $first = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));
        $second = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));

        $this->assertSame($first['series_id'], $second['series_id']);
        $this->assertSame($first['appointment_ids'], $second['appointment_ids']);
        $count = $this->db->prepare('SELECT COUNT(*) FROM nurse_passage_series WHERE nurse_id = ?');
        $count->execute([$this->nurseId]);
        $this->assertSame(1, (int) $count->fetchColumn());

        $this->expectException(AppointmentCreationConflict::class);
        $this->service->create($this->nurseId, ['notes' => 'Autre contenu'] + $input, $this->parisTime('2030-01-07 06:00'));
    }

    public function testSeriesStartingBeyondTheHorizonIsRefusedWithAnAccurateMessage(): void
    {
        $input = $this->chronicInput();
        $input['planning_config']['start_date'] = '2030-04-01';
        $input['planning_config']['end_date'] = '2030-04-03';

        try {
            $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));
            $this->fail('Une série sans passage dans les 60 jours ne doit pas être créée');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Aucun passage dans les 60 prochains jours', $e->getMessage());
        }
        $series = $this->db->prepare('SELECT COUNT(*) FROM nurse_passage_series WHERE nurse_id = ?');
        $series->execute([$this->nurseId]);
        $this->assertSame(0, (int) $series->fetchColumn());
    }

    public function testFailedCreationCanBeRetriedWithTheSameRequestId(): void
    {
        $input = $this->chronicInput() + ['client_request_id' => 'qa-retry-' . bin2hex(random_bytes(6))];
        $past = $input;
        $past['planning_config']['start_date'] = '2029-12-01';
        $past['planning_config']['end_date'] = '2029-12-03';

        try {
            $this->service->create($this->nurseId, $past, $this->parisTime('2030-01-07 06:00'));
            $this->fail('Une série entièrement passée ne doit pas être créée');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Aucun passage planifiable', $e->getMessage());
        }
        $claims = $this->db->prepare('SELECT COUNT(*) FROM appointment_creation_requests WHERE actor_id = ?');
        $claims->execute([$this->nurseId]);
        $this->assertSame(0, (int) $claims->fetchColumn());

        $this->assertSame(9, $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'))['created_appointments']);
    }

    public function testDuplicateCareWithDifferentOptionsIsKept(): void
    {
        $input = $this->chronicInput();
        $input['nursing_items'] = [
            ['category_id' => $this->categoryId, 'care_options' => ['site' => 'bras']],
            ['category_id' => $this->categoryId, 'care_options' => ['site' => 'cuisse']],
            ['category_id' => $this->categoryId, 'care_options' => ['site' => 'bras']],
        ];

        $result = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));

        $this->assertCount(2, $result['series']['nursing_items']);
        $items = $this->db->prepare('SELECT COUNT(*) FROM appointment_nursing_items WHERE appointment_id = ?');
        $items->execute([$result['appointment_ids'][0]]);
        $this->assertSame(2, (int) $items->fetchColumn());
    }

    public function testRollingWindowOnlyExtendsBeyondWhatWasAlreadyGenerated(): void
    {
        $input = $this->chronicInput();
        $input['planning_type'] = 'interval';
        $input['planning_config'] = [
            'start_date' => '2030-01-07',
            'every_days' => 1,
            'open_ended' => true,
            'daily_time_slots' => [['time_slot' => 'morning', 'custom_time' => null]],
        ];
        $input['time_slot'] = 'morning';
        $input['custom_time'] = null;
        $created = $this->service->create($this->nurseId, $input, $this->parisTime('2030-01-07 06:00'));
        $this->assertSame(60, $created['created_appointments']);
        $seriesId = $created['series_id'];
        $this->service->cancelOccurrence($seriesId, $this->nurseId, $this->activeAt($seriesId, '2030-01-20 08:00:00'), $this->parisTime('2030-01-07 07:00'));

        $added = $this->service->extendHorizon($this->nurseId, null, $this->parisTime('2030-01-17 06:00'));

        $this->assertSame(10, $added);
        $scheduled = array_column($this->active($seriesId), 'scheduled_at');
        $this->assertNotContains('2030-01-20 08:00:00', $scheduled);
        $this->assertSame('2030-03-17 08:00:00', end($scheduled));
        $this->assertSame(0, $this->service->extendHorizon($this->nurseId, null, $this->parisTime('2030-01-17 09:00')));
    }

    /** @return array<string, mixed> */
    private function chronicInput(): array
    {
        return [
            'patient_id' => $this->patientId,
            'planning_type' => 'weekdays',
            'planning_config' => [
                'start_date' => '2030-01-07',
                'end_date' => '2030-01-09',
                'weekdays' => [1, 2, 3, 4, 5, 6, 7],
                'daily_time_slots' => [
                    ['time_slot' => 'custom', 'custom_time' => '08:00'],
                    ['time_slot' => 'custom', 'custom_time' => '12:30'],
                    ['time_slot' => 'custom', 'custom_time' => '19:00'],
                ],
            ],
            'time_slot' => 'custom',
            'custom_time' => '08:00',
            'duration_minutes' => 15,
            'at_home' => true,
            'nursing_items' => [['category_id' => $this->categoryId, 'care_options' => []]],
            'notes' => 'Note initiale',
        ];
    }

    /** @return list<array{id: string, scheduled_at: string}> */
    private function active(string $seriesId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, scheduled_at FROM appointments
             WHERE passage_series_id = ? AND status = 'confirmed'
             ORDER BY scheduled_at"
        );
        $stmt->execute([$seriesId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function activeAt(string $seriesId, string $scheduledAt): string
    {
        foreach ($this->active($seriesId) as $apt) {
            if ($apt['scheduled_at'] === $scheduledAt) {
                return $apt['id'];
            }
        }
        $this->fail('Passage absent : ' . $scheduledAt);
    }

    private function parisTime(string $value): DateTimeImmutable
    {
        return new DateTimeImmutable($value, new DateTimeZone(self::TZ));
    }
}
