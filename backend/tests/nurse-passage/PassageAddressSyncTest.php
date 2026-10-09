<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';
require_once __DIR__ . '/../../lib/nurse-passage/PassageAddressSync.php';
require_once __DIR__ . '/../../lib/DatabaseTransaction.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Changement d'adresse du patient : seuls ses passages à domicile encore à faire et qui portaient
 * l'ancienne adresse sont mis à jour ; passé, passages faits, annulés ou lieu modifié à la main sont conservés.
 */
final class PassageAddressSyncTest extends TestCase
{
    use SkipsWithoutPdo;

    private const TZ = 'Europe/Paris';
    private const OLD_LABEL = '27 Rue d\'Aubagne, 13001 Marseille';
    private const NEW_ADDRESS = ['label' => '12 Rue Bouès, 13003 Marseille', 'lat' => 43.3087, 'lng' => 5.3813];

    private PDO $db;
    private Crypto $crypto;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;
    private string $seriesId = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->crypto = new Crypto();
        $this->fixtures = NursePassageFixtures::create($this->db);
        $this->seriesId = (new NursePassageSeriesService($this->db))->create($this->fixtures['nurse'], [
            'patient_id' => $this->fixtures['patient'],
            'planning_type' => 'weekdays',
            'planning_config' => [
                'start_date' => '2030-01-07',
                'end_date' => '2030-01-09',
                'weekdays' => [1, 2, 3, 4, 5, 6, 7],
                'daily_time_slots' => [['time_slot' => 'custom', 'custom_time' => '08:00']],
            ],
            'time_slot' => 'custom',
            'custom_time' => '08:00',
            'duration_minutes' => 15,
            'at_home' => true,
            'nursing_items' => [['category_id' => $this->fixtures['category'], 'care_options' => []]],
        ], new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone(self::TZ)))['series_id'];
    }

    protected function tearDown(): void
    {
        if ($this->fixtures !== null) {
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testPatientAddressChangeIsCopiedToUpcomingHomePassages(): void
    {
        $patientId = $this->fixtures['patient'];

        $this->assertTrue((new User($this->db))->update($patientId, ['address' => self::NEW_ADDRESS], $patientId, 'patient'));

        foreach (['2030-01-07', '2030-01-08', '2030-01-09'] as $day) {
            $passage = $this->passage($day);
            $this->assertSame(self::NEW_ADDRESS['label'], $passage['label']);
            $this->assertSame(self::NEW_ADDRESS, $passage['form_address']);
            $this->assertEqualsWithDelta(43.3087, $passage['lat'], 0.00001);
            $this->assertEqualsWithDelta(5.3813, $passage['lng'], 0.00001);
        }
    }

    public function testPastDoneCanceledAndManuallyRelocatedPassagesAreKept(): void
    {
        $manualLabel = '3 Rue Paul Claudel, 13004 Marseille';
        $manual = $this->crypto->encryptField($manualLabel);
        $this->db->prepare('UPDATE appointments SET address_encrypted = ?, address_dek = ?, location_lat = 43.305, location_lng = 5.4 WHERE id = ?')
            ->execute([$manual['encrypted'], $manual['dek'], $this->passage('2030-01-09')['id']]);
        $this->markVisitDone($this->passage('2030-01-08')['id']);

        $updated = $this->refresh(new DateTimeImmutable('2030-01-08 07:00', new DateTimeZone(self::TZ)));

        $this->assertSame(0, $updated);
        $this->assertSame(self::OLD_LABEL, $this->passage('2030-01-07')['label']);
        $this->assertSame(self::OLD_LABEL, $this->passage('2030-01-08')['label']);
        $this->assertSame($manualLabel, $this->passage('2030-01-09')['label']);
    }

    public function testCanceledPassageIsNotRelocated(): void
    {
        $canceled = $this->passage('2030-01-08')['id'];
        $this->db->prepare("UPDATE appointments SET status = 'canceled' WHERE id = ?")->execute([$canceled]);

        $updated = $this->refresh(new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone(self::TZ)));

        $this->assertSame(2, $updated);
        $this->assertSame(self::OLD_LABEL, $this->passage('2030-01-08')['label']);
        $this->assertSame(self::NEW_ADDRESS['label'], $this->passage('2030-01-09')['label']);
    }

    public function testAddressWithoutCoordinatesLeavesPassagesUntouched(): void
    {
        $patientId = $this->fixtures['patient'];

        (new User($this->db))->update($patientId, ['address' => ['label' => '12 Rue Bouès, 13003 Marseille']], $patientId, 'patient');

        $this->assertSame(self::OLD_LABEL, $this->passage('2030-01-07')['label']);
    }

    private function refresh(DateTimeImmutable $now): int
    {
        $sync = new PassageAddressSync($this->db, $this->crypto);
        $patientId = $this->fixtures['patient'];

        return DatabaseTransaction::run(
            $this->db,
            fn (): int => $sync->refreshPatientPassages($patientId, $sync->lockProfileAddress($patientId), self::NEW_ADDRESS, $now),
        );
    }

    private function markVisitDone(string $appointmentId): void
    {
        $planId = NursePassageFixtures::uuid();
        $this->db->prepare('INSERT INTO nurse_tour_plans (id, nurse_id, tour_date) VALUES (?, ?, ?)')
            ->execute([$planId, $this->fixtures['nurse'], '2030-01-08']);
        $this->db->prepare("INSERT INTO nurse_tour_stops (id, tour_plan_id, appointment_id, visit_status) VALUES (?, ?, ?, 'done')")
            ->execute([NursePassageFixtures::uuid(), $planId, $appointmentId]);
    }

    /** @return array{id: string, label: string, lat: float, lng: float, form_address: mixed} */
    private function passage(string $day): array
    {
        $stmt = $this->db->prepare('
            SELECT id, address_encrypted, address_dek, location_lat, location_lng, form_data_encrypted, form_data_dek
            FROM appointments WHERE passage_series_id = ? AND scheduled_at = ?
        ');
        $stmt->execute([$this->seriesId, $day . ' 08:00:00']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row, 'Passage absent : ' . $day);
        $formData = json_decode($this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']), true);

        return [
            'id' => (string) $row['id'],
            'label' => $this->crypto->decryptField($row['address_encrypted'], $row['address_dek']),
            'lat' => (float) $row['location_lat'],
            'lng' => (float) $row['location_lng'],
            'form_address' => $formData['address'] ?? null,
        ];
    }
}
