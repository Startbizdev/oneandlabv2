<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/medical-documents/MedicalDocumentReplacement.php';
require_once __DIR__ . '/../../lib/medical-documents/MedicalDocumentListQuery.php';
require_once __DIR__ . '/../../lib/PrescriptionService.php';
require_once __DIR__ . '/../../lib/RelativeProfile.php';
require_once __DIR__ . '/../../models/PatientRelative.php';

/**
 * Remplacement d'ordonnance : soignant ayant accès au document uniquement, ancienne version archivée et masquée
 * des listes, commandes pharmacie basculées sur la nouvelle version.
 */
final class PrescriptionReplacementTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $patient = '';
    private string $nurse = '';
    private string $pro = '';
    private string $otherNurse = '';
    /** @var list<string> */
    private array $profileIds = [];
    /** @var list<string> */
    private array $appointmentIds = [];
    /** @var list<string> */
    private array $orderIds = [];
    private string $tmpFile = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->patient = $this->profile('patient');
        $this->nurse = $this->profile('nurse');
        $this->pro = $this->profile('pro');
        $this->otherNurse = $this->profile('nurse');
        $this->db->prepare(
            "INSERT INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, 'manual_link', NULL, NOW())"
        )->execute([health_uuid(), $this->patient, $this->pro]);
        $this->tmpFile = (string) tempnam(sys_get_temp_dir(), 'rx');
        file_put_contents($this->tmpFile, "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            $relativeProfiles = $this->db->prepare('SELECT profile_id FROM patient_relatives WHERE patient_id = ? AND profile_id IS NOT NULL');
            $relativeProfiles->execute([$this->patient]);
            $relativeProfileIds = $relativeProfiles->fetchAll(PDO::FETCH_COLUMN);
            foreach ($this->orderIds as $id) {
                $this->db->prepare('DELETE FROM pharmacy_orders WHERE id = ?')->execute([$id]);
            }
            $in = implode(',', array_fill(0, count($this->profileIds), '?'));
            $documents = $this->db->prepare("SELECT id, file_path FROM medical_documents WHERE uploaded_by IN ($in)");
            $documents->execute($this->profileIds);
            foreach ($documents->fetchAll(PDO::FETCH_ASSOC) as $document) {
                if (str_starts_with((string) $document['file_path'], '/uploads/medical/')) {
                    MedicalDocumentsInternal::deleteStoredFile((string) $document['file_path']);
                }
                $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$document['id']]);
            }
            foreach ($this->appointmentIds as $id) {
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
            }
            $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ?')->execute([$this->patient]);
            $this->db->prepare('DELETE FROM patient_relatives WHERE patient_id = ?')->execute([$this->patient]);
            $all = array_merge($this->profileIds, $relativeProfileIds);
            $this->db->prepare('DELETE FROM profiles WHERE id IN (' . implode(',', array_fill(0, count($all), '?')) . ')')->execute($all);
            foreach ($relativeProfileIds as $profileId) {
                RelativeProfile::forget((string) $profileId);
            }
        }
        if ($this->tmpFile !== '' && is_file($this->tmpFile)) {
            unlink($this->tmpFile);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testProWithDossierAccessReplacesAndOldVersionLeavesTheLists(): void
    {
        $appointmentId = $this->appointment(null);
        $oldId = $this->prescription($appointmentId, $this->nurse);

        $payload = $this->replace($this->pro, 'pro', $oldId);

        $this->assertSame(['id', 'file_name', 'file_size', 'mime_type'], array_keys($payload));
        $this->assertSame('application/pdf', $payload['mime_type']);
        $old = MedicalDocumentAccess::loadForAccess($this->db, $oldId);
        $this->assertSame($payload['id'], $old['replaced_by_document_id']);
        $this->assertSame($this->pro, $old['replaced_by_user_id']);
        $this->assertNotNull($old['replaced_at']);
        $new = MedicalDocumentAccess::loadForAccess($this->db, $payload['id']);
        $this->assertSame($appointmentId, $new['appointment_id']);
        $this->assertSame('ordonnance', $new['document_type']);
        $this->assertSame('nursing', $new['prescription_kind']);
        $this->assertSame($this->pro, $new['uploaded_by']);
        $this->assertNull($new['replaced_by_document_id']);

        $listed = MedicalDocumentListQuery::listForAppointment(
            $this->db,
            ['user_id' => $this->nurse, 'role' => 'nurse'],
            ['patient_id' => $this->patient, 'relative_id' => null],
            $appointmentId,
        );
        $this->assertSame([$payload['id']], array_column($listed, 'id'));
        $this->assertSame([], PrescriptionService::listPrescriptions($this->db, new Crypto(), $this->nurse, 'nurse', 1, 20)['data']);
        $proList = PrescriptionService::listPrescriptions($this->db, new Crypto(), $this->pro, 'pro', 1, 20)['data'];
        $this->assertSame([$payload['id']], array_column($proList, 'id'));
    }

    public function testAssignedNurseReplacesAndPharmacyOrderFollows(): void
    {
        $appointmentId = $this->appointment(null);
        $oldId = $this->prescription($appointmentId, $this->pro);
        $orderId = $this->pharmacyOrder([$oldId, 'other-doc']);

        $newId = $this->replace($this->nurse, 'nurse', $oldId)['id'];

        $stmt = $this->db->prepare('SELECT prescription_document_ids FROM pharmacy_orders WHERE id = ?');
        $stmt->execute([$orderId]);
        $this->assertSame([$newId, 'other-doc'], json_decode((string) $stmt->fetchColumn(), true));
        $event = $this->db->prepare('SELECT actor_id, payload_json FROM pharmacy_order_events WHERE order_id = ? AND event_type = ?');
        $event->execute([$orderId, 'prescription_replaced']);
        $row = $event->fetch(PDO::FETCH_ASSOC);
        $this->assertSame($this->nurse, $row['actor_id']);
        $this->assertSame(['old_document_id' => $oldId, 'new_document_id' => $newId], json_decode((string) $row['payload_json'], true));
    }

    public function testRelativePrescriptionIsReplacedOnTheSameAppointment(): void
    {
        $relativeId = (new PatientRelative($this->db))->create([
            'first_name' => 'Lucie',
            'last_name' => 'Martin',
            'relationship_type' => 'parent',
            'birth_date' => '1950-05-02',
        ], $this->patient);
        $appointmentId = $this->appointment($relativeId);
        $oldId = $this->prescription($appointmentId, $this->pro);

        $newId = $this->replace($this->nurse, 'nurse', $oldId)['id'];

        $listed = MedicalDocumentListQuery::listForAppointment(
            $this->db,
            ['user_id' => $this->nurse, 'role' => 'nurse'],
            ['patient_id' => $this->patient, 'relative_id' => $relativeId],
            $appointmentId,
        );
        $this->assertSame([$newId], array_column($listed, 'id'));
    }

    public function testRefusals(): void
    {
        $appointmentId = $this->appointment(null);
        $oldId = $this->prescription($appointmentId, $this->pro);
        $report = $this->prescription($appointmentId, $this->pro, 'other');

        $this->assertRefused(403, fn () => $this->replace($this->patient, 'patient', $oldId));
        $this->assertRefused(403, fn () => $this->replace($this->otherNurse, 'nurse', $oldId));
        $this->assertRefused(422, fn () => $this->replace($this->nurse, 'nurse', $report));
        $this->assertRefused(404, fn () => $this->replace($this->nurse, 'nurse', health_uuid()));
        $this->assertNull(MedicalDocumentAccess::loadForAccess($this->db, $oldId)['replaced_by_document_id']);

        $this->replace($this->nurse, 'nurse', $oldId);
        $this->assertRefused(409, fn () => $this->replace($this->pro, 'pro', $oldId));
    }

    /** @return array{id: string, file_name: string, file_size: int, mime_type: string} */
    private function replace(string $userId, string $role, string $documentId): array
    {
        $file = ['name' => 'ordonnance-v2.pdf', 'tmp_name' => $this->tmpFile, 'size' => filesize($this->tmpFile), 'error' => UPLOAD_ERR_OK];

        return (new MedicalDocumentReplacement($this->db, new Crypto(), new Logger($this->db)))
            ->replace(['user_id' => $userId, 'role' => $role], $documentId, $file);
    }

    private function assertRefused(int $status, callable $call): void
    {
        try {
            $call();
            $this->fail('Remplacement accepté au lieu de ' . $status);
        } catch (HttpStatusException $e) {
            $this->assertSame($status, $e->httpStatus, $e->getMessage());
        }
    }

    private function profile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profileIds[] = $id;

        return $id;
    }

    private function appointment(?string $relativeId): string
    {
        $id = health_uuid();
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, relative_id, assigned_nurse_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, 'nursing', 'confirmed', $this->patient, 'patient', 'nursing', 'fixture-addr', 'fixture-dek',
            (new DateTimeImmutable('tomorrow 10:00', new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s'),
            $this->patient, $relativeId, $this->nurse,
        ]);
        $this->appointmentIds[] = $id;

        return $id;
    }

    private function prescription(string $appointmentId, string $uploadedBy, string $type = 'ordonnance'): string
    {
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type,
                document_type, prescription_kind)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([$id, $appointmentId, $uploadedBy, 'ordonnance.pdf', 'phpunit/' . $id . '.pdf', 128, 'application/pdf', $type, 'nursing']);

        return $id;
    }

    /** @param list<string> $documentIds */
    private function pharmacyOrder(array $documentIds): string
    {
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO pharmacy_orders (id, requester_id, requester_role, pharmacy_id, patient_id, fulfillment_mode,
                desired_fulfillment_date, status, prescription_document_ids)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, $this->nurse, 'nurse', $this->profile('pro'), $this->patient, 'click_collect',
            (new DateTimeImmutable('tomorrow'))->format('Y-m-d'), 'en_attente', json_encode($documentIds),
        ]);
        $this->orderIds[] = $id;

        return $id;
    }
}
