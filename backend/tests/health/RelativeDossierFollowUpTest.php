<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../ai/support/AiHttpHarness.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentCreateInputPolicy.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';
require_once __DIR__ . '/../../lib/nurse-tour/NurseTourService.php';
require_once __DIR__ . '/../../lib/nurse-tour/PatientAbsenceService.php';
require_once __DIR__ . '/../../lib/ai/AiConversationService.php';
require_once __DIR__ . '/../../lib/PrescriptionService.php';
require_once __DIR__ . '/../../lib/StaffPatientHubSearch.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderService.php';
require_once __DIR__ . '/../../lib/RelativeProfile.php';
require_once __DIR__ . '/../../lib/RelativeProfileBackfill.php';
require_once __DIR__ . '/../../models/PatientRelative.php';

use PHPUnit\Framework\TestCase;

/**
 * Suivi d'un proche depuis son dossier : RDV et passages saisis sur le dossier stockés sous le titulaire
 * (+ relative_id), tournée, ordonnance, conversation Cary, hub soignant et commandes pharmacie.
 */
final class RelativeDossierFollowUpTest extends TestCase
{
    use SkipsWithoutPdo;

    private const TOUR_DATE = '2030-01-08';

    private PDO $db;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;
    private string $relativeId;
    private string $relativeProfileId;
    /** @var list<string> */
    private array $extraProfiles = [];
    /** @var list<string> */
    private array $orderIds = [];
    /** @var list<string> */
    private array $documentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = NursePassageFixtures::create($this->db);
        $this->relativeId = (new PatientRelative($this->db))->create([
            'first_name' => 'Jeanne',
            'last_name' => 'Zephyrin',
            'relationship_type' => 'parent',
            'birth_date' => '1950-03-14',
            'address' => ['label' => '3 Rue Paradis, 13001 Marseille', 'lat' => 43.2951, 'lng' => 5.3768],
        ], $this->fixtures['patient']);
        $this->relativeProfileId = (string) RelativeProfile::profileIdForRelative($this->db, $this->relativeId);
        $this->grantAccess($this->fixtures['nurse'], $this->relativeProfileId);
    }

    protected function tearDown(): void
    {
        if ($this->fixtures !== null) {
            $nurseId = $this->fixtures['nurse'];
            foreach ($this->orderIds as $orderId) {
                $this->db->prepare('DELETE FROM pharmacy_order_events WHERE order_id = ?')->execute([$orderId]);
                $this->db->prepare('DELETE FROM pharmacy_orders WHERE id = ?')->execute([$orderId]);
            }
            foreach ($this->documentIds as $documentId) {
                $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$documentId]);
            }
            $this->db->prepare('DELETE FROM ai_conversations WHERE user_id = ?')->execute([$nurseId]);
            $this->db->prepare('DELETE FROM patient_absences WHERE nurse_id = ?')->execute([$nurseId]);
            $this->db->prepare('DELETE FROM appointments WHERE patient_id = ? OR patient_id = ?')
                ->execute([$this->fixtures['patient'], $this->relativeProfileId]);
            $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ?')->execute([$this->relativeProfileId]);
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
            $this->db->prepare('DELETE FROM patient_relatives WHERE id = ?')->execute([$this->relativeId]);
            foreach ([$this->relativeProfileId, ...$this->extraProfiles] as $profileId) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$profileId]);
            }
            RelativeProfile::forget($this->relativeProfileId);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testBookingOnTheRelativeDossierIsNormalizedUnderTheOwner(): void
    {
        $nurse = $this->nurse();
        $input = AppointmentCreateInputPolicy::apply($this->db, $nurse, [
            'type' => 'nursing',
            'patient_id' => $this->relativeProfileId,
            'assigned_nurse_id' => $nurse['user_id'],
        ]);
        $this->assertSame($this->fixtures['patient'], $input['patient_id']);
        $this->assertSame($this->relativeId, $input['relative_id']);
        $this->assertSame($nurse['user_id'], $input['assigned_nurse_id']);

        $owner = ['user_id' => $this->fixtures['patient'], 'role' => 'patient'];
        $ownerInput = AppointmentCreateInputPolicy::apply($this->db, $owner, ['type' => 'nursing', 'patient_id' => $this->relativeProfileId]);
        $this->assertSame([$this->fixtures['patient'], $this->relativeId], [$ownerInput['patient_id'], $ownerInput['relative_id']]);

        $this->assertDenied(400, fn () => AppointmentCreateInputPolicy::apply($this->db, $nurse, [
            'type' => 'nursing',
            'patient_id' => $this->relativeProfileId,
            'relative_id' => NursePassageFixtures::uuid(),
        ]));
        $otherPatient = $this->extraProfile('patient');
        $this->assertDenied(403, fn () => AppointmentCreateInputPolicy::apply(
            $this->db,
            ['user_id' => $otherPatient, 'role' => 'patient'],
            ['type' => 'nursing', 'patient_id' => $this->relativeProfileId],
        ));
        $this->assertDenied(403, fn () => AppointmentCreateInputPolicy::apply(
            $this->db,
            ['user_id' => $this->extraProfile('nurse'), 'role' => 'nurse'],
            ['type' => 'nursing', 'patient_id' => $this->relativeProfileId],
        ));
    }

    public function testPassagesOfTheRelativeDossierReachTheOwnerListAndTheTourStop(): void
    {
        $created = $this->relativePassage();
        $this->assertSame($this->relativeProfileId, $created['series']['patient_id'], 'La série reste rattachée au dossier du proche');

        $stmt = $this->db->prepare('SELECT id, patient_id, relative_id FROM appointments WHERE passage_series_id = ?');
        $stmt->execute([$created['series_id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(1, $rows);
        $this->assertSame([$this->fixtures['patient'], $this->relativeId], [$rows[0]['patient_id'], $rows[0]['relative_id']]);
        $appointmentId = (string) $rows[0]['id'];

        $ownerList = AiHttpHarness::request('GET', '/api/appointments?limit=50', AiHttpHarness::token($this->fixtures['patient'], 'patient'));
        $this->assertSame(200, $ownerList['status'], $ownerList['raw']);
        $this->assertContains($appointmentId, array_column($ownerList['json']['data'] ?? [], 'id'), 'Le titulaire voit le passage de son proche');

        $ownerAbsence = (new PatientAbsenceService($this->db))->create($this->fixtures['nurse'], $this->fixtures['patient'], $this->fixtures['nurse'], [
            'absence_type' => 'other',
            'start_date' => self::TOUR_DATE,
            'end_date' => self::TOUR_DATE,
        ]);
        $stop = $this->tourStop($appointmentId);
        $this->assertSame($this->fixtures['patient'], $stop['patient_id']);
        $this->assertSame($this->relativeId, $stop['relative_id']);
        $this->assertSame($this->relativeProfileId, $stop['relative_profile_id']);
        $this->assertFalse($stop['is_patient_absent_today'], 'L\'absence du titulaire ne vide pas l\'arrêt du proche');

        $relativeAbsence = (new PatientAbsenceService($this->db))->create($this->fixtures['nurse'], $this->relativeProfileId, $this->fixtures['nurse'], [
            'absence_type' => 'other',
            'start_date' => self::TOUR_DATE,
            'end_date' => self::TOUR_DATE,
        ]);
        $stop = $this->tourStop($appointmentId);
        $this->assertTrue($stop['is_patient_absent_today']);
        $this->assertSame($relativeAbsence['id'], $stop['patient_absence']['id'] ?? null);
        $this->assertNotSame($ownerAbsence['id'], $relativeAbsence['id']);
    }

    public function testPrescriptionAndCaryConversationUseTheRelativeDossier(): void
    {
        $appointmentId = (string) ($this->relativePassage()['appointment_ids'][0] ?? '');
        $this->assertNotSame('', $appointmentId);
        $nurse = $this->nurse();

        $conversation = (new AiConversationService($this->db))->create($nurse, ['context_type' => 'appointment', 'context_id' => $appointmentId]);
        $this->assertSame($this->relativeProfileId, $conversation['conversation']['patient_id']);

        $adeli = (new Crypto())->encryptField('751234567');
        $this->db->prepare('UPDATE profiles SET adeli_encrypted = ?, adeli_dek = ?, prescription_generation_enabled = 1 WHERE id = ?')
            ->execute([$adeli['encrypted'], $adeli['dek'], $nurse['user_id']]);
        foreach ([$this->relativeProfileId, $this->fixtures['patient']] as $requestedPatientId) {
            $result = PrescriptionService::generatePrescriptionRequest(
                $this->db,
                new Crypto(),
                $nurse,
                'Soins infirmiers à domicile : injection sous-cutanée quotidienne pendant 10 jours.',
                PrescriptionService::KIND_NURSING,
                $requestedPatientId,
                $appointmentId,
            );
            $this->assertTrue($result['success'], (string) ($result['error'] ?? ''));
            $this->assertSame($this->relativeProfileId, $result['data']['patient_id'], 'Ordonnance au nom du dossier du proche');
        }

        $mismatch = PrescriptionService::generatePrescriptionRequest(
            $this->db,
            new Crypto(),
            $nurse,
            'Soins infirmiers à domicile : injection sous-cutanée quotidienne pendant 10 jours.',
            PrescriptionService::KIND_NURSING,
            $this->extraProfile('patient'),
            $appointmentId,
        );
        $this->assertFalse($mismatch['success']);
        $this->assertSame('Le rendez-vous ne correspond pas au patient sélectionné', $mismatch['error']);
    }

    public function testHubOffersARelativeOnlyThroughItsAccessibleDossier(): void
    {
        $search = new StaffPatientHubSearch($this->db);

        $items = $search->search($this->nurse(), 'zephyrin')['items'];
        $this->assertSame([], array_values(array_filter($items, static fn (array $i): bool => $i['kind'] === 'relative')));
        $patientRows = array_values(array_filter($items, static fn (array $i): bool => $i['kind'] === 'patient'));
        $this->assertSame([$this->relativeProfileId], array_column($patientRows, 'patient_id'), 'Le dossier suivi apparaît une seule fois, comme patient');

        $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ? AND professional_id = ?')
            ->execute([$this->relativeProfileId, $this->fixtures['nurse']]);
        $items = $search->search($this->nurse(), 'zephyrin')['items'];
        $this->assertSame([], array_values(array_filter(
            $items,
            static fn (array $i): bool => in_array($i['kind'], ['relative', 'patient'], true),
        )), 'Sans accès au dossier du proche, aucun élément ne mène à un refus');
    }

    public function testPharmacyOrdersExposeTheRelativeDossier(): void
    {
        $pharmacyId = $this->extraProfile('pro');
        $relativeOrder = $this->pharmacyOrder($pharmacyId, $this->relativeId);
        $ownerOrder = $this->pharmacyOrder($pharmacyId, null);
        $service = new PharmacyOrderService($this->db, new PharmacyModuleConfig($this->db));

        $this->assertSame($this->relativeProfileId, $service->getById($relativeOrder)['relative_profile_id'] ?? null);
        $this->assertNull($service->getById($ownerOrder)['relative_profile_id']);

        $listed = [];
        foreach ($service->listForUser(['user_id' => $this->fixtures['nurse'], 'role' => 'nurse'], 'sent') as $order) {
            $listed[$order['id']] = $order['relative_profile_id'];
        }
        $this->assertSame($this->relativeProfileId, $listed[$relativeOrder] ?? null);
        $this->assertArrayHasKey($ownerOrder, $listed);
        $this->assertNull($listed[$ownerOrder]);
    }

    public function testPharmacyOrderPlacedOnTheRelativeDossierIsStoredUnderTheOwner(): void
    {
        $pharmacyId = $this->extraProfile('pro');
        $this->db->prepare("
            UPDATE profiles SET emploi = 'Pharmacien', pharmacy_orders_enabled = 1, pharmacy_orders_paused = 0,
                pharmacy_accepts_click_collect = 1, pharmacy_click_collect_days_json = '[1,2,3,4,5,6,7]'
            WHERE id = ?
        ")->execute([$pharmacyId]);
        $prescriptionId = NursePassageFixtures::uuid();
        $this->db->prepare("
            INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type, document_type, patient_id)
            VALUES (?, NULL, ?, 'ordonnance.pdf', ?, 128, 'application/pdf', 'ordonnance', ?)
        ")->execute([$prescriptionId, $this->fixtures['nurse'], 'phpunit/' . $prescriptionId . '.pdf', $this->relativeProfileId]);
        $this->documentIds[] = $prescriptionId;
        $service = new PharmacyOrderService($this->db, new PharmacyModuleConfig($this->db));
        $input = [
            'patient_id' => $this->relativeProfileId,
            'pharmacy_id' => $pharmacyId,
            'fulfillment_mode' => 'click_collect',
            'desired_fulfillment_date' => (new DateTimeImmutable('tomorrow', new DateTimeZone('Europe/Paris')))->format('Y-m-d'),
            'prescription_document_ids' => [$prescriptionId],
        ];

        $order = $service->create($this->nurse(), $input)['order'];
        $this->orderIds[] = (string) $order['id'];
        $this->assertSame($this->fixtures['patient'], $order['patient_id']);
        $this->assertSame($this->relativeId, $order['relative_id']);
        $this->assertSame($this->relativeProfileId, $order['relative_profile_id']);
        $ownerOrders = $service->listForUser(['user_id' => $this->fixtures['patient'], 'role' => 'patient'], 'patient');
        $this->assertContains($order['id'], array_column($ownerOrders, 'id'), 'Le titulaire voit la commande de son proche');

        $this->expectException(InvalidArgumentException::class);
        $service->create($this->nurse(), ['relative_id' => NursePassageFixtures::uuid()] + $input);
    }

    public function testBackfillMovesAppointmentsSavedOnTheRelativeDossierUnderTheOwner(): void
    {
        $legacyId = NursePassageFixtures::uuid();
        $this->db->prepare(
            "INSERT INTO appointments (id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, assigned_nurse_id)
             VALUES (?, 'nursing', 'confirmed', ?, 'nurse', 'nursing', 43.29, 5.38, 'fixture-addr', 'fixture-dek', ?, ?, ?)"
        )->execute([$legacyId, $this->fixtures['nurse'], self::TOUR_DATE . ' 09:00:00', $this->relativeProfileId, $this->fixtures['nurse']]);

        $dryRun = RelativeProfileBackfill::run($this->db, false);
        $this->assertGreaterThanOrEqual(1, $dryRun['appointments_on_relative_dossier']);
        $this->assertSame(0, $dryRun['appointments_normalized']);
        $this->assertSame([$this->relativeProfileId, null], $this->appointmentSubject($legacyId), 'Le dry-run n\'écrit rien');

        $applied = RelativeProfileBackfill::run($this->db, true);
        $this->assertSame($applied['appointments_on_relative_dossier'], $applied['appointments_normalized']);
        $this->assertSame([$this->fixtures['patient'], $this->relativeId], $this->appointmentSubject($legacyId));
        $this->assertSame(0, RelativeProfileBackfill::run($this->db, false)['appointments_on_relative_dossier']);
    }

    /** @return array{user_id: string, role: string} */
    private function nurse(): array
    {
        return ['user_id' => $this->fixtures['nurse'], 'role' => 'nurse'];
    }

    /** @return array<string, mixed> */
    private function relativePassage(): array
    {
        return (new NursePassageSeriesService($this->db))->create($this->fixtures['nurse'], [
            'patient_id' => $this->relativeProfileId,
            'planning_type' => 'single_day',
            'planning_config' => ['start_date' => self::TOUR_DATE],
            'time_slot' => 'morning',
            'duration_minutes' => 20,
            'at_home' => true,
            'nursing_items' => [['category_id' => $this->fixtures['category'], 'care_options' => []]],
        ], new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone('Europe/Paris')));
    }

    /** @return array<string, mixed> */
    private function tourStop(string $appointmentId): array
    {
        $tour = (new NurseTourService($this->db))->getTour($this->fixtures['nurse'], self::TOUR_DATE);
        foreach ($tour['stops'] as $stop) {
            if ($stop['appointment_id'] === $appointmentId) {
                return $stop;
            }
        }
        $this->fail('Passage absent de la tournée');
    }

    private function pharmacyOrder(string $pharmacyId, ?string $relativeId): string
    {
        $id = NursePassageFixtures::uuid();
        $this->db->prepare(
            "INSERT INTO pharmacy_orders (id, requester_id, requester_role, pharmacy_id, patient_id, relative_id, fulfillment_mode)
             VALUES (?, ?, 'nurse', ?, ?, ?, 'click_collect')"
        )->execute([$id, $this->fixtures['nurse'], $pharmacyId, $this->fixtures['patient'], $relativeId]);
        $this->orderIds[] = $id;

        return $id;
    }

    /** @return array{0: string, 1: ?string} */
    private function appointmentSubject(string $appointmentId): array
    {
        $stmt = $this->db->prepare('SELECT patient_id, relative_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return [(string) $row['patient_id'], $row['relative_id'] !== null ? (string) $row['relative_id'] : null];
    }

    private function grantAccess(string $professionalId, string $patientId): void
    {
        $this->db->prepare(
            "INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, 'manual_link', NULL, NOW())"
        )->execute([NursePassageFixtures::uuid(), $patientId, $professionalId]);
    }

    private function extraProfile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->extraProfiles[] = $id;

        return $id;
    }

    private function assertDenied(int $status, callable $call): void
    {
        try {
            $call();
            $this->fail('Création attendue refusée');
        } catch (AppointmentCreateInputDenied $e) {
            $this->assertSame($status, $e->httpStatus);
        }
    }
}
