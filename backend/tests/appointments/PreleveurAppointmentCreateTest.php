<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';

use PHPUnit\Framework\TestCase;

/**
 * Demande de prélèvement créée par un préleveur : en attente, attribuée à son seul labo, sans dispatch zone.
 */
final class PreleveurAppointmentCreateTest extends TestCase
{
    use SkipsWithoutPdo;

    private const LAT = 43.30;
    private const LNG = 5.37;

    private PDO $db;
    private Crypto $crypto;
    private User $users;
    private AppointmentNotificationService $notifications;
    private string $patientId;
    /** @var list<string> */
    private array $appointmentIds = [];
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->crypto = new Crypto();
        $this->users = new User($this->db);
        $notificationService = new NotificationService();
        $this->notifications = new AppointmentNotificationService(
            $this->db,
            $this->crypto,
            $notificationService,
            new AppointmentItemsResolver($this->db, $this->crypto),
            new AppointmentDispatchService($this->db, $this->crypto, $notificationService, new AdminDispatchEventLogger($this->db)),
        );
        $this->patientId = $this->users->createPatientForPreleveur([
            'email' => '',
            'first_name' => 'Rdv' . bin2hex(random_bytes(3)),
            'last_name' => 'Preleveur',
            'phone' => '0612345678',
            'role' => 'patient',
            'created_by' => TestFixtures::PRELEVEUR,
        ], TestFixtures::PRELEVEUR, TestFixtures::LAB);
        $this->profileIds[] = $this->patientId;
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->appointmentIds as $id) {
                $this->db->prepare('DELETE FROM notifications WHERE data LIKE ?')->execute(['%' . $id . '%']);
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
            }
            foreach ($this->profileIds as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        parent::tearDown();
    }

    public function testConsentIsRequired(): void
    {
        $input = $this->requestInput();
        unset($input['patient_booking_consent']);

        $denied = $this->deniedFor(TestFixtures::PRELEVEUR, $input);
        $this->assertSame(400, $denied->httpStatus);
        $this->assertSame('PATIENT_BOOKING_CONSENT_REQUIRED', $denied->errorCode);
    }

    public function testPatientOutsidePreleveurListIsRejected(): void
    {
        $input = $this->requestInput();
        $input['patient_id'] = TestFixtures::PATIENT_B;

        $denied = $this->deniedFor(TestFixtures::PRELEVEUR, $input);
        $this->assertSame(403, $denied->httpStatus);
        $this->assertSame('FORBIDDEN', $denied->errorCode);
    }

    public function testNursingRequestIsRejected(): void
    {
        PreleveurLabRequestPolicy::assertBloodTestOnly($this->requestInput());

        foreach ([['type' => 'nursing', 'form_type' => 'nursing'], ['type' => 'blood_test', 'form_type' => 'nursing'], []] as $override) {
            $input = array_merge($this->requestInput(), $override);
            if ($override === []) {
                unset($input['type'], $input['form_type']);
            }
            $error = null;
            try {
                PreleveurLabRequestPolicy::assertBloodTestOnly($input);
            } catch (PreleveurLabRequestDenied $e) {
                $error = $e;
            }
            $this->assertInstanceOf(PreleveurLabRequestDenied::class, $error);
            $this->assertSame(403, $error->httpStatus);
            $this->assertSame('FORBIDDEN', $error->errorCode);
        }
    }

    public function testPreleveurRequestIsRecordedAsDirectAssign(): void
    {
        $prepared = PreleveurLabRequestPolicy::apply($this->db, TestFixtures::PRELEVEUR, $this->requestInput());
        $id = (new Appointment($this->db))->create($prepared, TestFixtures::PRELEVEUR, 'preleveur');
        $this->appointmentIds[] = $id;

        (new AppointmentPostCreateEffects($this->db))->runAfterCreate(
            $id,
            ['user_id' => TestFixtures::PRELEVEUR, 'role' => 'preleveur'],
            [],
            $prepared,
            TestFixtures::PRELEVEUR,
            'preleveur',
            null
        );

        $stmt = $this->db->prepare('SELECT dispatch_mode FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $this->assertSame('direct_assign', $stmt->fetchColumn());
    }

    public function testPreleveurWithoutLabIsRejected(): void
    {
        $orphan = $this->insertPreleveurWithoutLab();

        $denied = $this->deniedFor($orphan, $this->requestInput());
        $this->assertSame(400, $denied->httpStatus);
    }

    public function testRequestIsForcedToPendingOnItsLabWithoutZoneDispatch(): void
    {
        $input = $this->requestInput();
        $input['assigned_to'] = TestFixtures::PRELEVEUR;
        $input['assigned_lab_id'] = TestFixtures::SUBACCOUNT;
        $input['status'] = 'confirmed';
        $input['preferred_lab_brand_id'] = '00000000-0000-4000-8000-0000000bbbbb';
        $input['form_data']['lab_preference_mode'] = 'brand_choice';

        $prepared = PreleveurLabRequestPolicy::apply($this->db, TestFixtures::PRELEVEUR, $input);

        $this->assertSame(TestFixtures::LAB, $prepared['assigned_lab_id']);
        $this->assertSame('pending', $prepared['status']);
        $this->assertTrue($prepared['skip_zone_dispatch']);
        $this->assertSame('platform_match', $prepared['lab_preference_mode']);
        $this->assertArrayNotHasKey('assigned_to', $prepared);
        $this->assertArrayNotHasKey('preferred_lab_brand_id', $prepared);
        $this->assertArrayNotHasKey('lab_preference_mode', $prepared['form_data']);
    }

    public function testCreatedRequestOnlyNotifiesThePreleveurLab(): void
    {
        $prepared = PreleveurLabRequestPolicy::apply($this->db, TestFixtures::PRELEVEUR, $this->requestInput());
        $id = (new Appointment($this->db))->create($prepared, TestFixtures::PRELEVEUR, 'preleveur');
        $this->appointmentIds[] = $id;

        $stmt = $this->db->prepare('SELECT status, assigned_lab_id, assigned_to, created_by_role FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('pending', $row['status']);
        $this->assertSame(TestFixtures::LAB, $row['assigned_lab_id']);
        $this->assertNull($row['assigned_to']);
        $this->assertSame('preleveur', $row['created_by_role']);

        $this->notifications->runPostCreateNotifications($id, $prepared, 'preleveur');

        $this->assertSame([TestFixtures::LAB], $this->offerProfileIds($id));
        $this->assertSame(1, $this->countLabNotifications($id));
    }

    public function testRepriseConfirmedForPreleveurDoesNotNotifyLab(): void
    {
        $input = $this->requestInput();
        $input['assigned_lab_id'] = TestFixtures::LAB;
        $input['assigned_to'] = TestFixtures::PRELEVEUR;
        $input['status'] = 'confirmed';
        $id = (new Appointment($this->db))->create($input, TestFixtures::PRELEVEUR, 'preleveur');
        $this->appointmentIds[] = $id;

        $this->notifications->runPostCreateNotifications($id, $input, 'preleveur');

        $this->assertSame([], $this->offerProfileIds($id));
        $this->assertSame(0, $this->countLabNotifications($id));
    }

    private function deniedFor(string $preleveurId, array $input): PreleveurLabRequestDenied
    {
        try {
            PreleveurLabRequestPolicy::apply($this->db, $preleveurId, $input);
        } catch (PreleveurLabRequestDenied $e) {
            return $e;
        }
        $this->fail('La demande aurait dû être refusée.');
    }

    /** @return array<string, mixed> */
    private function requestInput(): array
    {
        return [
            'type' => 'blood_test',
            'form_type' => 'blood_test',
            'patient_id' => $this->patientId,
            'patient_booking_consent' => true,
            'scheduled_at' => $this->scheduledAt(),
            'address' => ['label' => '1 rue de la Paix, Marseille', 'lat' => self::LAT, 'lng' => self::LNG],
            'form_data' => ['first_name' => 'Rdv', 'last_name' => 'Preleveur'],
        ];
    }

    private function insertPreleveurWithoutLab(): string
    {
        $id = $this->uuid();
        $email = 'prel-orphan-' . $id . '@test.invalid';
        $emailEnc = $this->crypto->encryptField($email);
        $first = $this->crypto->encryptField('Sans');
        $last = $this->crypto->encryptField('Labo');
        $this->db->prepare('
            INSERT INTO profiles (id, role, email_encrypted, email_dek, email_hash, first_name_encrypted, first_name_dek,
                last_name_encrypted, last_name_dek)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, 'preleveur', $emailEnc['encrypted'], $emailEnc['dek'], hash('sha256', $email),
            $first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'],
        ]);
        $this->profileIds[] = $id;

        return $id;
    }

    /** @return list<string> */
    private function offerProfileIds(string $appointmentId): array
    {
        $stmt = $this->db->prepare('SELECT profile_id FROM appointment_offers WHERE appointment_id = ? ORDER BY profile_id');
        $stmt->execute([$appointmentId]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private function countLabNotifications(string $appointmentId): int
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'new_appointment_available' AND data LIKE ?");
        $stmt->execute([TestFixtures::LAB, '%' . $appointmentId . '%']);

        return (int) $stmt->fetchColumn();
    }

    private function scheduledAt(): string
    {
        $date = new DateTimeImmutable('+4 days');
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
