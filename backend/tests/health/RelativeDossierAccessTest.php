<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../ai/support/AiHttpHarness.php';
require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/HealthRecordService.php';
require_once __DIR__ . '/../../lib/health/ClinicalVitalService.php';
require_once __DIR__ . '/../../lib/health/PatientPhoneService.php';
require_once __DIR__ . '/../../lib/health/PatientTransmissionService.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../lib/RelativeProfile.php';
require_once __DIR__ . '/../../lib/RelativeProfileBackfill.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';
require_once __DIR__ . '/../../lib/MedicalDocumentAccess.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../../models/Appointment.php';

use PHPUnit\Framework\TestCase;

/**
 * Dossier patient d'un proche : profil dédié, accès du titulaire (carnet, numéros, lecture des constantes)
 * et des seuls soignants du proche (RDV avec relative_id), jamais du dossier du titulaire.
 */
final class RelativeDossierAccessTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $ownerId;
    private string $otherPatientId;
    private string $nurseId;
    private string $relativeId;
    private string $relativeProfileId;
    /** @var list<string> */
    private array $profileIds = [];
    /** @var list<string> */
    private array $appointmentIds = [];
    /** @var list<string> */
    private array $documentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->ownerId = $this->profile('patient');
        $this->otherPatientId = $this->profile('patient');
        $this->nurseId = $this->profile('nurse');
        $this->relativeId = (new PatientRelative($this->db))->create([
            'first_name' => 'Jeanne',
            'last_name' => 'Martin',
            'relationship_type' => 'parent',
            'birth_date' => '1950-03-14',
        ], $this->ownerId);
        $this->relativeProfileId = (string) RelativeProfile::profileIdForRelative($this->db, $this->relativeId);
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            $owners = array_values(array_unique(array_filter($this->profileIds)));
            $relativeProfiles = [];
            if ($owners !== []) {
                $in = implode(',', array_fill(0, count($owners), '?'));
                $stmt = $this->db->prepare("SELECT profile_id FROM patient_relatives WHERE patient_id IN ($in) AND profile_id IS NOT NULL");
                $stmt->execute($owners);
                $relativeProfiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }
            foreach ($this->appointmentIds as $appointmentId) {
                $this->db->prepare('DELETE FROM appointment_nursing_items WHERE appointment_id = ?')->execute([$appointmentId]);
                $this->db->prepare('DELETE FROM patient_professional_access WHERE appointment_id = ?')->execute([$appointmentId]);
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$appointmentId]);
            }
            foreach ($this->documentIds as $documentId) {
                $this->db->prepare('DELETE FROM patient_relative_documents WHERE medical_document_id = ?')->execute([$documentId]);
                $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$documentId]);
            }
            $all = array_values(array_unique(array_merge($owners, $relativeProfiles)));
            if ($all !== []) {
                $in = implode(',', array_fill(0, count($all), '?'));
                foreach (['health_record_answers', 'patient_clinical_vitals', 'patient_phones', 'patient_transmissions', 'patient_professional_access'] as $table) {
                    $this->db->prepare("DELETE FROM $table WHERE patient_id IN ($in)")->execute($all);
                }
                $this->db->prepare("DELETE FROM patient_professional_access WHERE professional_id IN ($in)")->execute($all);
                $this->db->prepare("DELETE FROM patient_relatives WHERE patient_id IN ($in)")->execute($all);
                $this->db->prepare("DELETE FROM profiles WHERE id IN ($in)")->execute($all);
            }
            foreach ($relativeProfiles as $profileId) {
                RelativeProfile::forget((string) $profileId);
            }
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testCreatingARelativeCreatesOneLoginlessPatientDossier(): void
    {
        $this->assertNotSame('', $this->relativeProfileId);
        $this->assertNotSame($this->ownerId, $this->relativeProfileId);

        $stmt = $this->db->prepare('SELECT role, created_by, email_hash, phone_digits_hash FROM profiles WHERE id = ?');
        $stmt->execute([$this->relativeProfileId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($profile);
        $this->assertSame('patient', $profile['role']);
        $this->assertNull($profile['created_by']);
        $this->assertNull($profile['phone_digits_hash']);
        $this->assertSame(hash('sha256', RelativeProfile::technicalEmail($this->relativeId)), $profile['email_hash']);

        $this->assertSame($this->relativeProfileId, RelativeProfile::ensureProfile($this->db, $this->relativeId));
        $count = $this->db->prepare('SELECT COUNT(*) FROM profiles WHERE email_hash = ?');
        $count->execute([$profile['email_hash']]);
        $this->assertSame(1, (int) $count->fetchColumn());

        $this->assertSame(['relative_id' => $this->relativeId, 'owner_id' => $this->ownerId], RelativeProfile::resolve($this->db, $this->relativeProfileId));
        $this->assertTrue(RelativeProfile::isOwner($this->db, $this->ownerId, $this->relativeProfileId));
        $this->assertFalse(RelativeProfile::isOwner($this->db, $this->otherPatientId, $this->relativeProfileId));

        $relatives = new PatientRelative($this->db);
        $this->assertSame($this->relativeProfileId, $relatives->getById($this->relativeId, $this->ownerId)['profile_id'] ?? null);

        $relatives->update($this->relativeId, ['first_name' => 'Jeannette'], $this->ownerId);
        $name = $this->db->prepare('SELECT first_name_encrypted, first_name_dek FROM profiles WHERE id = ?');
        $name->execute([$this->relativeProfileId]);
        $row = $name->fetch(PDO::FETCH_ASSOC);
        $this->assertSame(
            'Jeannette',
            (new Crypto())->decryptField((string) $row['first_name_encrypted'], (string) $row['first_name_dek']),
            'L\'identité du proche est recopiée sur son dossier',
        );
    }

    public function testOwnerManagesCarnetAndPhonesAndOnlyReadsVitals(): void
    {
        $owner = ['user_id' => $this->ownerId, 'role' => 'patient'];
        $other = ['user_id' => $this->otherPatientId, 'role' => 'patient'];
        $nurse = $this->nurse();
        $this->grantAccess($this->nurseId, $this->relativeProfileId);

        $carnet = new HealthRecordService($this->db);
        $carnet->upsertAnswersForViewer($owner, $this->relativeProfileId, ['allergies_has' => ['value' => 'yes']]);
        $source = $this->db->prepare("SELECT source FROM health_record_answers WHERE patient_id = ? AND question_key = 'allergies_has'");
        $source->execute([$this->relativeProfileId]);
        $this->assertSame('patient', $source->fetchColumn());
        $this->assertIsArray($carnet->getRecapForViewer($owner, $this->relativeProfileId));
        $this->assertIsArray($carnet->getRecapForViewer($nurse, $this->relativeProfileId));
        $this->assertCarnetRefused(fn () => $carnet->getRecapForViewer($other, $this->relativeProfileId));
        $this->assertCarnetRefused(fn () => $carnet->upsertAnswersForViewer($other, $this->relativeProfileId, ['allergies_has' => ['value' => 'no']]));

        $phones = new PatientPhoneService($this->db);
        $created = $phones->create($owner, $this->relativeProfileId, ['label' => 'fixe', 'phone' => '01 23 45 67 89']);
        $this->assertSame($this->relativeProfileId, $created['patient_id']);
        $this->assertCount(1, $phones->listForPatient($owner, $this->relativeProfileId));
        $this->assertForbidden(fn () => $phones->listForPatient($other, $this->relativeProfileId));
        $phones->delete($owner, $this->relativeProfileId, $created['id']);

        $vitals = new ClinicalVitalService($this->db);
        $vitals->create($nurse, $this->relativeProfileId, ['vital_type' => 'heart_rate', 'value' => 72]);
        $read = $vitals->listForStaff($owner, $this->relativeProfileId);
        $this->assertArrayHasKey('heart_rate', $read['latest_by_type']);
        $this->assertNotEmpty($vitals->historyForType($owner, $this->relativeProfileId, 'heart_rate')['history']);
        $this->assertForbidden(fn () => $vitals->create($owner, $this->relativeProfileId, ['vital_type' => 'heart_rate', 'value' => 80]));
        $this->assertForbidden(fn () => $vitals->listForStaff($other, $this->relativeProfileId));

        $transmissions = new PatientTransmissionService(static fn (): string => 'notif', $this->db);
        $transmissions->create($nurse, $this->relativeProfileId, ['body' => 'Entre soignants']);
        $this->assertForbidden(fn () => $transmissions->list($owner, $this->relativeProfileId));

        $this->assertTrue(PatientDossierAccess::canAccess($this->db, new User($this->db), $owner, $this->relativeProfileId));
        $this->assertFalse(PatientDossierAccess::canAccess($this->db, new User($this->db), $other, $this->relativeProfileId));
    }

    public function testNurseAcceptingARelativeAppointmentOnlyGetsTheRelativeDossier(): void
    {
        $appointmentId = $this->appointment('pending', null, $this->relativeId);
        $this->appointmentModel()->updateStatus($appointmentId, 'confirmed', $this->nurseId, 'nurse');

        $this->assertTrue($this->hasLink($this->relativeProfileId, $this->nurseId), 'Lien vers le dossier du proche');
        $this->assertFalse($this->hasLink($this->ownerId, $this->nurseId), 'Aucun lien vers le dossier du titulaire');

        $users = new User($this->db);
        $nurse = $this->nurse();
        $this->assertTrue(PatientDossierAccess::canAccess($this->db, $users, $nurse, $this->relativeProfileId));
        $this->assertFalse(PatientDossierAccess::canAccess($this->db, $users, $nurse, $this->ownerId));

        $carnet = new HealthRecordService($this->db);
        $this->assertIsArray($carnet->getRecapForViewer($nurse, $this->relativeProfileId));
        $this->assertCarnetRefused(fn () => $carnet->getRecapForViewer($nurse, $this->ownerId));
        $this->assertForbidden(fn () => (new ClinicalVitalService($this->db))->listForStaff($nurse, $this->ownerId));
    }

    public function testStaffAppointmentListAndHistoryAreScopedToTheRelativeDossier(): void
    {
        $relativeAppointment = $this->appointment('confirmed', $this->nurseId, $this->relativeId);
        $ownerAppointment = $this->appointment('confirmed', $this->nurseId, null);
        $this->grantAccess($this->nurseId, $this->relativeProfileId);

        $this->assertSame([$relativeAppointment], $this->staffListIds($this->relativeProfileId));
        $this->assertSame([$ownerAppointment], $this->staffListIds($this->ownerId));

        $token = AiHttpHarness::token($this->nurseId, 'nurse');
        $history = AiHttpHarness::request('GET', '/api/patient-history?patient_id=' . $this->relativeProfileId, $token);
        $this->assertSame(200, $history['status'], $history['raw']);
        $this->assertSame([$relativeAppointment], array_column($history['json']['data'] ?? [], 'id'));
        $row = $history['json']['data'][0];
        $this->assertSame($this->relativeProfileId, $row['relative_profile_id'] ?? null);
        $this->assertSame($this->relativeProfileId, $row['relative']['profile_id'] ?? null);

        $legacy = AiHttpHarness::request('GET', '/api/patient-history?patient_id=' . $this->ownerId . '&relative_id=' . $this->relativeId, $token);
        $this->assertSame([$relativeAppointment], array_column($legacy['json']['data'] ?? [], 'id'));

        $ownerHistory = AiHttpHarness::request('GET', '/api/patient-history?patient_id=' . $this->ownerId, $token);
        $this->assertSame([$ownerAppointment], array_column($ownerHistory['json']['data'] ?? [], 'id'), 'Le dossier du titulaire exclut les RDV du proche');
    }

    public function testRelativeDossierEndpointsForOwnerOtherPatientAndUnlinkedNurse(): void
    {
        $this->appointment('pending', null, $this->relativeId);
        $ownerToken = AiHttpHarness::token($this->ownerId, 'patient');
        $otherToken = AiHttpHarness::token($this->otherPatientId, 'patient');
        $nurseToken = AiHttpHarness::token($this->nurseId, 'nurse');
        $carnetPath = '/api/patients/' . $this->relativeProfileId . '/health-record';
        $vitalsPath = '/api/patients/' . $this->relativeProfileId . '/clinical-vitals';

        $this->assertSame(200, AiHttpHarness::request('GET', $carnetPath, $ownerToken)['status']);
        $patched = AiHttpHarness::request('PATCH', $carnetPath, $ownerToken, ['answers' => ['allergies_has' => ['value' => 'no']]]);
        $this->assertSame(200, $patched['status'], $patched['raw']);
        $this->assertSame(403, AiHttpHarness::request('GET', $carnetPath, $otherToken)['status']);
        $this->assertSame(403, AiHttpHarness::request('GET', '/api/patients/' . $this->ownerId . '/health-record', $ownerToken)['status'], 'Son propre carnet passe par /health-record');
        $this->assertSame(403, AiHttpHarness::request('GET', $carnetPath, $nurseToken)['status'], 'Offre en attente : aucun accès au dossier');

        $this->assertSame(200, AiHttpHarness::request('GET', $vitalsPath, $ownerToken)['status']);
        $this->assertSame(403, AiHttpHarness::request('GET', $vitalsPath, $otherToken)['status']);
        $this->assertSame(403, AiHttpHarness::request('POST', $vitalsPath, $ownerToken, ['vital_type' => 'heart_rate', 'value' => 70])['status']);
    }

    public function testTransmissionCareItemsAndTeamComeFromTheRelativeAppointments(): void
    {
        $relativeAppointment = $this->appointment('confirmed', $this->nurseId, $this->relativeId);
        $ownerAppointment = $this->appointment('confirmed', null, null);
        $relativeItem = $this->nursingItem($relativeAppointment, 'Pansement proche');
        $ownerItem = $this->nursingItem($ownerAppointment, 'Soin titulaire');
        $this->grantAccess($this->nurseId, $this->relativeProfileId);
        $relativePro = $this->profile('pro');
        $ownerPro = $this->profile('pro');
        $this->grantAccess($relativePro, $this->relativeProfileId);
        $this->grantAccess($ownerPro, $this->ownerId);

        $sent = [];
        $service = new PatientTransmissionService(static function (string $userId) use (&$sent): string {
            $sent[] = $userId;

            return 'notif-' . count($sent);
        }, $this->db);
        $today = (new DateTimeImmutable('today', new DateTimeZone('Europe/Paris')))->format('Y-m-d');

        $items = array_column($service->careItemsForDate($this->nurse(), $this->relativeProfileId, $today)['passage_items'], 'id');
        $this->assertSame([$relativeItem], $items);
        $this->assertNotContains($ownerItem, $items);
        $this->assertForbidden(fn () => $service->careItemsForDate($this->nurse(), $this->ownerId, $today));

        $created = $service->create($this->nurse(), $this->relativeProfileId, [
            'body' => 'Pansement refait',
            'care_items' => [['kind' => 'nursing_item', 'id' => $relativeItem]],
        ]);
        $this->assertSame($relativeItem, $created['care_items'][0]['id']);
        try {
            $service->create($this->nurse(), $this->relativeProfileId, ['body' => 'x', 'care_items' => [['kind' => 'nursing_item', 'id' => $ownerItem]]]);
            $this->fail('Soin du titulaire accepté sur le dossier du proche');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('Soin inconnu pour ce patient', $e->getMessage());
        }
        $this->assertContains($relativePro, $sent);
        $this->assertNotContains($ownerPro, $sent);
    }

    public function testRelativeDocumentsFollowTheRelativeDossier(): void
    {
        $documentId = $this->relativeDocument();
        $document = ['id' => $documentId, 'uploaded_by' => $this->ownerId, 'appointment_id' => null];
        $relativeNurse = $this->nurse();
        $ownerNurseId = $this->profile('nurse');
        $ownerNurse = ['user_id' => $ownerNurseId, 'role' => 'nurse'];
        $this->grantAccess($this->nurseId, $this->relativeProfileId);
        $this->grantAccess($ownerNurseId, $this->ownerId);
        $users = new User($this->db);

        $this->assertTrue(MedicalDocumentAccess::userCanAccess($this->db, $relativeNurse, $document));
        $this->assertFalse(MedicalDocumentAccess::userCanAccess($this->db, $ownerNurse, $document), 'Un lien au seul titulaire n\'ouvre plus les documents du proche');
        $this->assertTrue(MedicalDocumentAccess::userCanAccess($this->db, ['user_id' => $this->ownerId, 'role' => 'patient'], $document));

        $expected = ['patient_id' => $this->ownerId, 'relative_id' => $this->relativeId];
        $owner = ['user_id' => $this->ownerId, 'role' => 'patient'];
        $this->assertSame($expected, PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, $owner, $this->relativeProfileId, null));
        $this->assertSame($expected, PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, $owner, $this->ownerId, $this->relativeId));
        $this->assertSame($expected, PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, $relativeNurse, $this->relativeProfileId, null));
        $this->assertNull(PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, $ownerNurse, $this->relativeProfileId, null));
        $this->assertNull(PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, $ownerNurse, $this->ownerId, $this->relativeId));
        $this->assertNull(PatientDossierAccess::resolveProfileDocumentsTarget($this->db, $users, ['user_id' => $this->otherPatientId, 'role' => 'patient'], $this->relativeProfileId, null));

        $listed = AiHttpHarness::request('GET', '/api/patient-documents?user_id=' . $this->relativeProfileId, AiHttpHarness::token($this->nurseId, 'nurse'));
        $this->assertSame(200, $listed['status'], $listed['raw']);
        $this->assertStringContainsString($documentId, $listed['raw']);
        $refused = AiHttpHarness::request('GET', '/api/patient-documents?user_id=' . $this->relativeProfileId, AiHttpHarness::token($ownerNurseId, 'nurse'));
        $this->assertSame(403, $refused['status']);
    }

    public function testBackfillIsDryRunByDefaultThenIdempotent(): void
    {
        $legacyRelativeId = $this->legacyRelativeWithoutProfile();
        $appointmentId = $this->appointment('confirmed', $this->nurseId, $legacyRelativeId);
        $this->db->prepare(
            "INSERT INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, 'appointment_accepted', NULL, NOW())"
        )->execute([health_uuid(), $this->ownerId, $this->nurseId]);

        $dryRun = RelativeProfileBackfill::run($this->db, false);
        $this->assertGreaterThanOrEqual(1, $dryRun['relatives_without_profile']);
        $this->assertSame(0, $dryRun['profiles_created']);
        $this->assertGreaterThanOrEqual(1, $dryRun['relative_links_missing']);
        $this->assertSame(0, $dryRun['relative_links_created']);
        $this->assertGreaterThanOrEqual(1, $dryRun['overgranted_owner_links']);
        $this->assertNull(RelativeProfile::profileIdForRelative($this->db, $legacyRelativeId), 'Le dry-run n\'écrit rien');

        $applied = RelativeProfileBackfill::run($this->db, true);
        $this->assertSame($applied['relatives_without_profile'], $applied['profiles_created']);
        $this->assertSame($applied['relative_links_missing'], $applied['relative_links_created']);
        $legacyProfileId = RelativeProfile::profileIdForRelative($this->db, $legacyRelativeId);
        $this->assertNotNull($legacyProfileId);
        $this->assertTrue($this->hasLink($legacyProfileId, $this->nurseId));
        $this->assertTrue($this->hasLink($this->ownerId, $this->nurseId), 'Le lien titulaire hérité est signalé, jamais supprimé');
        $this->assertGreaterThanOrEqual(1, $applied['overgranted_owner_links']);

        $again = RelativeProfileBackfill::run($this->db, true);
        $this->assertSame(0, $again['relatives_without_profile']);
        $this->assertSame(0, $again['profiles_created']);
        $this->assertSame(0, $again['relative_links_missing']);
        $this->assertSame($legacyProfileId, RelativeProfile::profileIdForRelative($this->db, $legacyRelativeId));
        $this->assertNotSame('', $appointmentId);
    }

    private function profile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profileIds[] = $id;

        return $id;
    }

    /** @return array{user_id: string, role: string} */
    private function nurse(): array
    {
        return ['user_id' => $this->nurseId, 'role' => 'nurse'];
    }

    private function appointment(string $status, ?string $nurseId, ?string $relativeId): string
    {
        $id = health_uuid();
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, relative_id, assigned_nurse_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, 'nursing', $status, $this->ownerId, 'patient', 'nursing', 'fixture-addr', 'fixture-dek',
            (new DateTimeImmutable('today 10:00', new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s'),
            $this->ownerId, $relativeId, $nurseId,
        ]);
        $this->appointmentIds[] = $id;

        return $id;
    }

    private function nursingItem(string $appointmentId, string $label): string
    {
        $id = health_uuid();
        $this->db->prepare(
            "INSERT INTO appointment_nursing_items (id, appointment_id, category_id, label, care_options, sort_order) VALUES (?, ?, NULL, ?, '{}', 0)"
        )->execute([$id, $appointmentId, $label]);

        return $id;
    }

    private function relativeDocument(): string
    {
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type)
            VALUES (?, NULL, ?, ?, ?, ?, ?)
        ')->execute([$id, $this->ownerId, 'carte-vitale.pdf', 'phpunit/' . $id . '.pdf', 128, 'application/pdf']);
        $this->db->prepare('
            INSERT INTO patient_relative_documents (id, patient_id, relative_id, document_type, medical_document_id)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([health_uuid(), $this->ownerId, $this->relativeId, 'carte_vitale', $id]);
        $this->documentIds[] = $id;

        return $id;
    }

    /** Proche antérieur à la migration 126 : aucune ligne profiles associée. */
    private function legacyRelativeWithoutProfile(): string
    {
        $crypto = new Crypto();
        $first = $crypto->encryptField('Paul');
        $last = $crypto->encryptField('Ancien');
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO patient_relatives (id, patient_id, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                relationship_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ')->execute([$id, $this->ownerId, $first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'], 'parent']);

        return $id;
    }

    private function grantAccess(string $professionalId, string $patientId): void
    {
        $this->db->prepare(
            'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, ?, NULL, NOW())'
        )->execute([health_uuid(), $patientId, $professionalId, 'manual_link']);
    }

    private function hasLink(string $patientId, string $professionalId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM patient_professional_access WHERE patient_id = ? AND professional_id = ? LIMIT 1');
        $stmt->execute([$patientId, $professionalId]);

        return (bool) $stmt->fetchColumn();
    }

    /** @return list<string> */
    private function staffListIds(string $patientId): array
    {
        $flags = AppointmentListQueryBuilder::schemaFlags($this->db);
        $builder = new AppointmentListQueryBuilder(
            $this->db,
            AppointmentListQuery::fromArray(['scope' => 'list', 'patient_id' => $patientId, 'limit' => '50']),
            $this->nurse(),
            $flags['useRelativeJoin'],
            $flags['hasMergedColumn'],
        );
        $sql = $builder->build();
        $stmt = $this->db->prepare($sql->selectSql);
        $stmt->execute($sql->params);

        return array_values(array_unique(array_map('strval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id'))));
    }

    private function appointmentModel(): Appointment
    {
        return new Appointment($this->db);
    }

    private function assertForbidden(callable $call): void
    {
        try {
            $call();
            $this->fail('Accès attendu refusé');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
    }

    private function assertCarnetRefused(callable $call): void
    {
        try {
            $call();
            $this->fail('Accès carnet attendu refusé');
        } catch (RuntimeException $e) {
            $this->assertSame('Accès carnet refusé', $e->getMessage());
        }
    }
}
