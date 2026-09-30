<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/LabBrand.php';

use PHPUnit\Framework\TestCase;

/**
 * RDV prise de sang « réseau choisi » : offres réservées aux labos de la marque dans leur zone.
 */
final class BrandDispatchTest extends TestCase
{
    use SkipsWithoutPdo;

    private const LAT = 43.30;
    private const LNG = 5.37;

    private PDO $db;
    private Crypto $crypto;
    private LabBrand $brands;
    private AppointmentDispatchService $dispatch;
    private AppointmentNotificationService $notifications;
    private string $brandId;
    /** @var array<string, string> */
    private array $labs = [];
    /** @var list<string> */
    private array $appointmentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->crypto = new Crypto();
        $this->brands = new LabBrand($this->db);
        $notificationService = new NotificationService();
        $this->dispatch = new AppointmentDispatchService(
            $this->db,
            $this->crypto,
            $notificationService,
            new AdminDispatchEventLogger($this->db),
        );
        $this->notifications = new AppointmentNotificationService(
            $this->db,
            $this->crypto,
            $notificationService,
            new AppointmentItemsResolver($this->db, $this->crypto),
            $this->dispatch,
        );

        $this->labs = [
            'inZone' => $this->insertLab(true, 0, self::LAT, self::LNG),
            'notLinked' => $this->insertLab(true, 0, self::LAT, self::LNG),
            'farAway' => $this->insertLab(true, 0, 48.85, 2.35),
            'closed' => $this->insertLab(false, 0, self::LAT, self::LNG),
            'longLead' => $this->insertLab(true, 24 * 30, self::LAT, self::LNG),
        ];
        $brand = $this->brands->create([
            'name' => 'Réseau test ' . bin2hex(random_bytes(4)),
            'is_active' => 1,
            'lab_ids' => [$this->labs['inZone'], $this->labs['farAway'], $this->labs['closed'], $this->labs['longLead']],
        ]);
        $this->brandId = (string) $brand['id'];
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->appointmentIds as $id) {
                $this->db->prepare('DELETE FROM notifications WHERE data LIKE ?')->execute(['%' . $id . '%']);
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
            }
            if (isset($this->brandId)) {
                $this->db->prepare('DELETE FROM lab_brands WHERE id = ?')->execute([$this->brandId]);
            }
            foreach ($this->labs as $labId) {
                $this->db->prepare('DELETE FROM notifications WHERE user_id = ?')->execute([$labId]);
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$labId]);
            }
        }
        parent::tearDown();
    }

    public function testLabIdsAreStoredAndReturned(): void
    {
        $brand = $this->brands->getById($this->brandId);
        $this->assertNotNull($brand);
        $this->assertEqualsCanonicalizing(
            [$this->labs['inZone'], $this->labs['farAway'], $this->labs['closed'], $this->labs['longLead']],
            $brand['lab_ids']
        );
        $listed = array_values(array_filter($this->brands->listAll(), fn (array $b): bool => $b['id'] === $this->brandId));
        $this->assertCount(4, $listed[0]['lab_ids']);
    }

    public function testNonLabProfileIsRejectedAndLinksAreUnchanged(): void
    {
        try {
            $this->brands->update($this->brandId, ['name' => 'Renommée', 'lab_ids' => [TestFixtures::PATIENT_A]]);
            $this->fail('Un profil patient ne doit pas pouvoir être rattaché à une marque.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('laboratoire', $e->getMessage());
        }
        $brand = $this->brands->getById($this->brandId);
        $this->assertNotSame('Renommée', $brand['name']);
        $this->assertCount(4, $brand['lab_ids']);
    }

    public function testUpdateWithoutLabIdsKeepsLinks(): void
    {
        $brand = $this->brands->getById($this->brandId);
        $this->brands->update($this->brandId, ['name' => $brand['name'], 'is_active' => 1]);
        $this->assertCount(4, $this->brands->listLabIds($this->brandId));
    }

    public function testOffersOnlyGoToEligibleBrandLabsInZone(): void
    {
        $aptId = $this->insertBrandAppointment();
        $notified = $this->dispatch->dispatchBrandLabs($aptId, $this->brandId, self::LAT + 0.001, self::LNG + 0.001, $this->scheduledAt());

        $this->assertSame(1, $notified);
        $this->assertSame([$this->labs['inZone']], $this->offerProfileIds($aptId));
        $this->assertSame(1, $this->countNotifications($this->labs['inZone'], $aptId));
        $this->assertSame(0, $this->countNotifications($this->labs['notLinked'], $aptId));
    }

    public function testRedispatchExcludingOnlyEligibleLabFallsBackToAdmin(): void
    {
        $aptId = $this->insertBrandAppointment();
        $this->dispatch->dispatchBrandLabs($aptId, $this->brandId, self::LAT, self::LNG, $this->scheduledAt());

        $handled = $this->notifications->redispatchBrandChoiceIfAny(
            $aptId,
            self::LAT,
            self::LNG,
            $this->scheduledAt(),
            ['lab_preference_mode' => 'brand_choice', 'preferred_lab_brand_name' => 'Réseau test'],
            $this->labs['inZone']
        );

        $this->assertTrue($handled, 'Le redispatch d’un RDV réseau ne doit pas repartir en zone entière.');
        $this->assertSame([], $this->offerProfileIds($aptId));
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'blood_test_brand_to_process' AND data LIKE ?");
        $stmt->execute([TestFixtures::ADMIN, '%' . $aptId . '%']);
        $this->assertSame(1, (int) $stmt->fetchColumn());
    }

    public function testBrandWithoutLabsNotifiesNobody(): void
    {
        $this->brands->update($this->brandId, ['name' => 'Sans labo ' . bin2hex(random_bytes(3)), 'is_active' => 1, 'lab_ids' => []]);
        $aptId = $this->insertBrandAppointment();

        $this->assertSame(0, $this->dispatch->dispatchBrandLabs($aptId, $this->brandId, self::LAT, self::LNG, $this->scheduledAt()));
        $this->assertSame([], $this->offerProfileIds($aptId));
    }

    public function testNonBrandAppointmentIsNotHandledAsBrand(): void
    {
        $aptId = $this->insertBrandAppointment('platform_match');
        $this->assertFalse($this->notifications->redispatchBrandChoiceIfAny($aptId, self::LAT, self::LNG, $this->scheduledAt(), [], null));
    }

    public function testPatientBrandChoiceDispatchModeIsPersisted(): void
    {
        $aptId = $this->insertBrandAppointment();
        (new AdminDispatchEventLogger($this->db))->setDispatchMode($aptId, 'patient_brand_choice');
        $stmt = $this->db->prepare('SELECT dispatch_mode FROM appointments WHERE id = ?');
        $stmt->execute([$aptId]);
        $this->assertSame('patient_brand_choice', $stmt->fetchColumn());
    }

    private function insertLab(bool $accepting, int $leadHours, float $lat, float $lng): string
    {
        $id = $this->uuid();
        $email = $this->crypto->encryptField('lab-' . $id . '@test.invalid');
        $first = $this->crypto->encryptField('Labo');
        $last = $this->crypto->encryptField('Réseau');
        $this->db->prepare('
            INSERT INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek,
                last_name_encrypted, last_name_dek, is_accepting_appointments, min_booking_lead_time_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, 'lab', $email['encrypted'], $email['dek'], hash('sha256', 'lab-' . $id . '@test.invalid'),
            $first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'], $accepting ? 1 : 0, $leadHours,
        ]);
        $this->db->prepare('
            INSERT INTO coverage_zones (id, owner_id, role, zone_type, center_lat, center_lng, radius_km, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ')->execute([$this->uuid(), $id, 'lab', 'circle', $lat, $lng, 10]);
        return $id;
    }

    private function insertBrandAppointment(string $mode = 'brand_choice'): string
    {
        $id = $this->uuid();
        $address = $this->crypto->encryptField((string) json_encode(['lat' => self::LAT, 'lng' => self::LNG]));
        $this->db->prepare('
            INSERT INTO appointments (id, type, status, patient_id, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, lab_preference_mode, preferred_lab_brand_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, 'blood_test', 'pending', TestFixtures::PATIENT_A, TestFixtures::PATIENT_A, 'patient', 'blood_test',
            self::LAT, self::LNG, $address['encrypted'], $address['dek'], $this->scheduledAt(),
            $mode, $mode === 'brand_choice' ? $this->brandId : null,
        ]);
        $this->appointmentIds[] = $id;
        return $id;
    }

    /** @return list<string> */
    private function offerProfileIds(string $appointmentId): array
    {
        $stmt = $this->db->prepare('SELECT profile_id FROM appointment_offers WHERE appointment_id = ? ORDER BY profile_id');
        $stmt->execute([$appointmentId]);
        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private function countNotifications(string $userId, string $appointmentId): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'new_appointment_available' AND data LIKE ?");
        $stmt->execute([$userId, '%' . $appointmentId . '%']);
        return (int) $stmt->fetchColumn();
    }

    private function scheduledAt(): string
    {
        $date = new DateTimeImmutable('+3 days');
        while ((int) $date->format('N') >= 6) {
            $date = $date->modify('+1 day');
        }
        return $date->format('Y-m-d') . ' 10:00:00';
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
