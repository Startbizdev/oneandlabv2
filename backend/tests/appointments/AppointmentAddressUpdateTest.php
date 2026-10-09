<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';
require_once __DIR__ . '/../../models/Appointment.php';

/**
 * Modifier l'adresse d'un RDV écrit la même adresse dans la colonne chiffrée et dans form_data.address
 * (la tournée lit form_data en premier) ; un form_data sans adresse n'en reçoit pas.
 */
final class AppointmentAddressUpdateTest extends TestCase
{
    use SkipsWithoutPdo;

    private const NEW_ADDRESS = ['label' => '12 Rue Bouès, 13003 Marseille', 'lat' => 43.3087, 'lng' => 5.3813];

    private PDO $db;
    private Crypto $crypto;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;
    private string $appointmentId = '';

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
        $created = (new NursePassageSeriesService($this->db))->create($this->fixtures['nurse'], [
            'patient_id' => $this->fixtures['patient'],
            'planning_type' => 'weekdays',
            'planning_config' => [
                'start_date' => '2030-01-07',
                'end_date' => '2030-01-07',
                'weekdays' => [1, 2, 3, 4, 5, 6, 7],
                'daily_time_slots' => [['time_slot' => 'custom', 'custom_time' => '08:00']],
            ],
            'time_slot' => 'custom',
            'custom_time' => '08:00',
            'duration_minutes' => 15,
            'at_home' => true,
            'nursing_items' => [['category_id' => $this->fixtures['category'], 'care_options' => []]],
        ], new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone('Europe/Paris')));
        $this->appointmentId = $created['appointment_ids'][0];
    }

    protected function tearDown(): void
    {
        if ($this->fixtures !== null) {
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testNurseReschedulePayloadWritesTheNewAddressInBothPlaces(): void
    {
        $staleFormData = $this->stored()['form_data'];

        $this->update(['address' => self::NEW_ADDRESS, 'form_data' => $staleFormData]);

        $stored = $this->stored();
        $this->assertSame(self::NEW_ADDRESS['label'], $stored['label']);
        $this->assertEqualsWithDelta(43.3087, $stored['lat'], 0.00001);
        $this->assertSame(self::NEW_ADDRESS, $stored['form_data']['address']);
    }

    public function testAddressOnlyUpdateAlsoRefreshesFormDataAddress(): void
    {
        $this->update(['address' => self::NEW_ADDRESS]);

        $stored = $this->stored();
        $this->assertSame(self::NEW_ADDRESS['label'], $stored['label']);
        $this->assertSame(self::NEW_ADDRESS, $stored['form_data']['address']);
        $this->assertSame('nurse_passage', $stored['form_data']['passage_source']);
    }

    public function testFormDataAddressChangeAlsoUpdatesTheColumn(): void
    {
        $formData = $this->stored()['form_data'];
        $formData['address'] = self::NEW_ADDRESS;

        $this->update(['form_data' => $formData]);

        $stored = $this->stored();
        $this->assertSame(self::NEW_ADDRESS['label'], $stored['label']);
        $this->assertEqualsWithDelta(5.3813, $stored['lng'], 0.00001);
    }

    public function testFormDataWithoutAddressIsLeftWithoutAddress(): void
    {
        $formData = $this->stored()['form_data'];
        unset($formData['address']);
        $encrypted = $this->crypto->encryptField(json_encode($formData, JSON_THROW_ON_ERROR));
        $this->db->prepare('UPDATE appointments SET form_data_encrypted = ?, form_data_dek = ? WHERE id = ?')
            ->execute([$encrypted['encrypted'], $encrypted['dek'], $this->appointmentId]);

        $this->update(['address' => self::NEW_ADDRESS]);

        $stored = $this->stored();
        $this->assertSame(self::NEW_ADDRESS['label'], $stored['label']);
        $this->assertArrayNotHasKey('address', $stored['form_data']);
    }

    /** @param array<string, mixed> $data */
    private function update(array $data): void
    {
        (new Appointment($this->db))->update($this->appointmentId, $data, $this->fixtures['nurse'], 'nurse');
    }

    /** @return array{label: string, lat: float, lng: float, form_data: array<string, mixed>} */
    private function stored(): array
    {
        $stmt = $this->db->prepare('
            SELECT address_encrypted, address_dek, location_lat, location_lng, form_data_encrypted, form_data_dek
            FROM appointments WHERE id = ?
        ');
        $stmt->execute([$this->appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row);
        $formData = json_decode($this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']), true);

        return [
            'label' => $this->crypto->decryptField($row['address_encrypted'], $row['address_dek']),
            'lat' => (float) $row['location_lat'],
            'lng' => (float) $row['location_lng'],
            'form_data' => is_array($formData) ? $formData : [],
        ];
    }
}
