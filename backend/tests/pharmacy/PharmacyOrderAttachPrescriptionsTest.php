<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/bootstrap.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';

/**
 * Ajout d'ordonnance après commande : accès, statut, document d'un autre patient (base de test Docker).
 */
final class PharmacyOrderAttachPrescriptionsTest extends TestCase
{
    private ?PDO $db = null;
    private PharmacyOrderService $service;
    private string $pharmacyId = '';
    /** @var list<string> */
    private array $orderIds = [];
    /** @var list<string> */
    private array $documentIds = [];
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        try {
            $config = require __DIR__ . '/../../config/database.php';
            $this->db = new PDO(
                sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
                $config['username'],
                $config['password'],
                $config['options'] ?? []
            );
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (Throwable $e) {
            $this->markTestSkipped('DB unavailable: ' . $e->getMessage());
        }
        $this->service = new PharmacyOrderService($this->db, new PharmacyModuleConfig($this->db));
        $this->pharmacyId = TestFixtures::insertProfile($this->db, 'pro');
        $this->profileIds[] = $this->pharmacyId;
    }

    protected function tearDown(): void
    {
        if ($this->db !== null) {
            foreach ($this->orderIds as $id) {
                $this->db->prepare('DELETE FROM pharmacy_orders WHERE id = ?')->execute([$id]);
            }
            foreach ($this->documentIds as $id) {
                $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$id]);
            }
            foreach ($this->profileIds as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        unset($this->service);
        $this->db = null;
        parent::tearDown();
    }

    public function testRequesterAttachesOwnUploadAndEventIsRecorded(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $documentId = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_A);

        $order = $this->service->attachPrescriptions($this->nurse(), $orderId, [$documentId]);

        $this->assertSame(['existing-doc', $documentId], $order['prescription_document_ids']);
        $event = $this->db->prepare('SELECT actor_id, payload_json FROM pharmacy_order_events WHERE order_id = ? AND event_type = ?');
        $event->execute([$orderId, 'prescriptions_added']);
        $row = $event->fetch(PDO::FETCH_ASSOC);
        $this->assertNotFalse($row);
        $this->assertSame(TestFixtures::NURSE, $row['actor_id']);
        $this->assertSame(['document_ids' => [$documentId]], json_decode((string) $row['payload_json'], true));
    }

    public function testPatientOfTheOrderCanAttachDuringComplementRequest(): void
    {
        $orderId = $this->insertOrder('complement_demande');
        $documentId = $this->insertDocument(TestFixtures::PATIENT_A, TestFixtures::PATIENT_A);

        $order = $this->service->attachPrescriptions($this->patientA(), $orderId, [$documentId]);

        $this->assertContains($documentId, $order['prescription_document_ids']);
    }

    public function testAnsweringAComplementRequestPutsTheOrderBackToPending(): void
    {
        $orderId = $this->insertOrder('complement_demande');
        $documentId = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_A);

        $order = $this->service->attachPrescriptions($this->nurse(), $orderId, [$documentId]);

        $this->assertSame('en_attente', $order['status']);
        $events = $this->db->prepare('
            SELECT actor_id, from_status, to_status FROM pharmacy_order_events WHERE order_id = ? AND event_type = ?
        ');
        $events->execute([$orderId, 'status_change']);
        $this->assertSame(
            [['actor_id' => TestFixtures::NURSE, 'from_status' => 'complement_demande', 'to_status' => 'en_attente']],
            $events->fetchAll(PDO::FETCH_ASSOC),
        );
    }

    public function testAttachingWhilePendingKeepsTheStatusWithoutStatusEvent(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $documentId = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_A);

        $order = $this->service->attachPrescriptions($this->nurse(), $orderId, [$documentId]);

        $this->assertSame('en_attente', $order['status']);
        $events = $this->db->prepare('SELECT COUNT(*) FROM pharmacy_order_events WHERE order_id = ? AND event_type = ?');
        $events->execute([$orderId, 'status_change']);
        $this->assertSame(0, (int) $events->fetchColumn());
    }

    public function testPharmacyCannotAttach(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $documentId = $this->insertDocument($this->pharmacyId, TestFixtures::PATIENT_A);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Action non autorisée');
        $this->service->attachPrescriptions(['user_id' => $this->pharmacyId, 'role' => 'pro'], $orderId, [$documentId]);
    }

    public function testUnrelatedProfessionalCannotAttach(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $otherNurse = TestFixtures::insertProfile($this->db, 'nurse');
        $this->profileIds[] = $otherNurse;
        $documentId = $this->insertDocument($otherNurse, TestFixtures::PATIENT_A);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Action non autorisée');
        $this->service->attachPrescriptions(['user_id' => $otherNurse, 'role' => 'nurse'], $orderId, [$documentId]);
    }

    /** @dataProvider lockedStatusProvider */
    public function testLockedStatusIsRefused(string $status): void
    {
        $orderId = $this->insertOrder($status);
        $documentId = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_A);

        try {
            $this->service->attachPrescriptions($this->nurse(), $orderId, [$documentId]);
            $this->fail('Statut ' . $status . ' accepté');
        } catch (DomainException) {
            $this->assertSame(['existing-doc'], $this->storedPrescriptionIds($orderId));
        }
    }

    /** @return array<string, array{string}> */
    public static function lockedStatusProvider(): array
    {
        return [
            'acceptée' => ['acceptee'],
            'en cours' => ['en_cours'],
            'terminée' => ['terminee'],
            'refusée' => ['refusee'],
            'annulée' => ['annulee'],
        ];
    }

    public function testDocumentOfAnotherPatientIsRefusedAndNothingIsWritten(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $documentId = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_B);

        try {
            $this->service->attachPrescriptions($this->nurse(), $orderId, [$documentId]);
            $this->fail('Ordonnance d’un autre patient acceptée');
        } catch (RuntimeException $e) {
            $this->assertSame('L’ordonnance ne correspond pas au patient sélectionné', $e->getMessage());
        }
        $this->assertSame(['existing-doc'], $this->storedPrescriptionIds($orderId));
        $events = $this->db->prepare('SELECT COUNT(*) FROM pharmacy_order_events WHERE order_id = ?');
        $events->execute([$orderId]);
        $this->assertSame(0, (int) $events->fetchColumn());
    }

    public function testPatientCannotAttachDocumentUploadedByAnotherPatient(): void
    {
        $orderId = $this->insertOrder('en_attente');
        $documentId = $this->insertDocument(TestFixtures::PATIENT_B, TestFixtures::PATIENT_B);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Accès ordonnance refusé');
        $this->service->attachPrescriptions($this->patientA(), $orderId, [$documentId]);
    }

    public function testInvalidInputIsRejected(): void
    {
        $orderId = $this->insertOrder('en_attente');

        foreach ([null, 'doc', [], ['  ']] as $input) {
            try {
                $this->service->attachPrescriptions($this->nurse(), $orderId, $input);
                $this->fail('Entrée acceptée : ' . json_encode($input));
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testAlreadyAttachedAndLimitAreRejected(): void
    {
        $orderId = $this->insertOrder('en_attente');

        try {
            $this->service->attachPrescriptions($this->nurse(), $orderId, ['existing-doc']);
            $this->fail('Ordonnance déjà jointe acceptée');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('Ordonnance déjà jointe à la commande', $e->getMessage());
        }

        $documents = [];
        for ($i = 0; $i < 10; $i++) {
            $documents[] = $this->insertDocument(TestFixtures::NURSE, TestFixtures::PATIENT_A);
        }
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Dix ordonnances maximum');
        $this->service->attachPrescriptions($this->nurse(), $orderId, $documents);
    }

    public function testCanAttachPrescriptionsFlagMatchesRule(): void
    {
        $order = ['requester_id' => TestFixtures::NURSE, 'patient_id' => TestFixtures::PATIENT_A, 'status' => 'en_attente'];

        $this->assertTrue(PharmacyOrderAccess::canAttachPrescriptions($this->nurse(), $order));
        $this->assertTrue(PharmacyOrderAccess::canAttachPrescriptions($this->patientA(), $order));
        $this->assertFalse(PharmacyOrderAccess::canAttachPrescriptions(['user_id' => $this->pharmacyId, 'role' => 'pro'], $order));
        $this->assertFalse(PharmacyOrderAccess::canAttachPrescriptions($this->nurse(), ['status' => 'acceptee'] + $order));
        $this->assertFalse(PharmacyOrderAccess::canAttachPrescriptions(['user_id' => TestFixtures::PATIENT_A, 'role' => 'nurse'], $order));
    }

    /** @return array{user_id: string, role: string} */
    private function nurse(): array
    {
        return ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'];
    }

    /** @return array{user_id: string, role: string} */
    private function patientA(): array
    {
        return ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];
    }

    private function insertOrder(string $status): string
    {
        $id = PharmacyOrderService::newUuid();
        $this->db->prepare('
            INSERT INTO pharmacy_orders (id, requester_id, requester_role, pharmacy_id, patient_id, fulfillment_mode,
                desired_fulfillment_date, status, prescription_document_ids)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, TestFixtures::NURSE, 'nurse', $this->pharmacyId, TestFixtures::PATIENT_A, 'click_collect',
            (new DateTimeImmutable('tomorrow'))->format('Y-m-d'), $status, json_encode(['existing-doc']),
        ]);
        $this->orderIds[] = $id;

        return $id;
    }

    private function insertDocument(string $uploadedBy, string $patientId): string
    {
        $id = PharmacyOrderService::newUuid();
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type,
                document_type, patient_id)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([$id, $uploadedBy, 'ordonnance.pdf', 'phpunit/' . $id . '.pdf', 128, 'application/pdf', 'ordonnance', $patientId]);
        $this->documentIds[] = $id;

        return $id;
    }

    /** @return list<string> */
    private function storedPrescriptionIds(string $orderId): array
    {
        $stmt = $this->db->prepare('SELECT prescription_document_ids FROM pharmacy_orders WHERE id = ?');
        $stmt->execute([$orderId]);

        return json_decode((string) $stmt->fetchColumn(), true);
    }
}
