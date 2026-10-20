<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/PharmacyFixtures.php';
require_once __DIR__ . '/../../lib/pharmacy/bootstrap.php';

/**
 * Commande passée après scan du QR pharmacie : la pharmacie devient la pharmacie liée du patient,
 * sans jamais faire échouer la commande.
 */
final class PharmacyOrderQrAttributionTest extends TestCase
{
    private PDO $db;
    private PharmacyOrderService $service;
    private PharmacyCatalogService $catalog;
    private string $documentId = '';
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $config = new PharmacyModuleConfig($this->db);
        $this->service = new PharmacyOrderService($this->db, $config);
        $this->catalog = new PharmacyCatalogService($this->db, new Crypto(), $config);

        $this->documentId = PharmacyOrderService::newUuid();
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type,
                document_type, patient_id)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $this->documentId, TestFixtures::PATIENT_A, 'ordonnance.pdf', 'phpunit/' . $this->documentId . '.pdf',
            128, 'application/pdf', 'ordonnance', TestFixtures::PATIENT_A,
        ]);
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->profileIds as $id) {
                PharmacyFixtures::deleteProfile($this->db, $id);
            }
            $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$this->documentId]);
        }
        unset($this->service, $this->catalog, $this->db);
        parent::tearDown();
    }

    public function testOrderWithThePharmacyQrLinksThePharmacyToThePatient(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));
        [$qrId, $token] = PharmacyFixtures::qrCode($this->db, $pharmacyId, 'https://cary.test/pharmacie/' . $pharmacyId);

        $result = $this->service->create($this->patientA(), $this->input($pharmacyId) + ['utm_qr' => $token]);

        $this->assertSame($pharmacyId, $result['order']['pharmacy_id']);
        $this->assertContains($pharmacyId, $this->catalog->pharmacyIdsLinkedToPatient(TestFixtures::PATIENT_A));
        $link = $this->link($pharmacyId);
        $this->assertSame('qr_origin', $link['source'] ?? null);
        $this->assertSame($qrId, $link['origin_qr_code_id'] ?? null);
    }

    public function testInvalidTokenStillCreatesTheOrderWithoutLink(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));

        $result = $this->service->create($this->patientA(), $this->input($pharmacyId) + ['utm_qr' => 'zzzzzzzzzzzz']);

        $this->assertSame('en_attente', $result['order']['status']);
        $this->assertNull($this->link($pharmacyId));
    }

    public function testQrOfAnotherProfessionalIsNotAttributed(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));
        $otherId = $this->track(PharmacyFixtures::pharmacy($this->db));
        [, $token] = PharmacyFixtures::qrCode($this->db, $otherId, 'https://cary.test/pharmacie/' . $otherId);

        $this->service->create($this->patientA(), $this->input($pharmacyId) + ['utm_qr' => $token]);

        $this->assertNull($this->link($pharmacyId));
        $this->assertNull($this->link($otherId));
    }

    public function testNonStringTokenIsIgnored(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));

        $result = $this->service->create($this->patientA(), $this->input($pharmacyId) + ['utm_qr' => ['x']]);

        $this->assertSame($pharmacyId, $result['order']['pharmacy_id']);
        $this->assertNull($this->link($pharmacyId));
    }

    /** @return array<string, mixed> */
    private function input(string $pharmacyId): array
    {
        return [
            'patient_id' => TestFixtures::PATIENT_A,
            'pharmacy_id' => $pharmacyId,
            'fulfillment_mode' => 'click_collect',
            'desired_fulfillment_date' => (new DateTimeImmutable('tomorrow', new DateTimeZone('Europe/Paris')))->format('Y-m-d'),
            'prescription_document_ids' => [$this->documentId],
        ];
    }

    /** @return array{user_id: string, role: string} */
    private function patientA(): array
    {
        return ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];
    }

    /** @return array<string, mixed>|null */
    private function link(string $professionalId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT source, origin_qr_code_id FROM patient_professional_access WHERE patient_id = ? AND professional_id = ?
        ');
        $stmt->execute([TestFixtures::PATIENT_A, $professionalId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function track(string $id): string
    {
        $this->profileIds[] = $id;

        return $id;
    }
}
