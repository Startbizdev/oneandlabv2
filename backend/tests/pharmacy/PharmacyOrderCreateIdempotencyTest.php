<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/bootstrap.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';

/**
 * Envoi de commande pharmacie rejoué avec le même `client_request_id` (base de test Docker).
 */
final class PharmacyOrderCreateIdempotencyTest extends TestCase
{
    private ?PDO $db = null;
    private PharmacyOrderService $service;
    private string $pharmacyId = '';
    private string $documentId = '';
    /** @var list<string> */
    private array $requestKeys = [];

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
        $this->db->prepare("
            UPDATE profiles SET emploi = 'Pharmacien', pharmacy_orders_enabled = 1, pharmacy_orders_paused = 0,
                pharmacy_accepts_click_collect = 1, pharmacy_click_collect_days_json = '[1,2,3,4,5,6,7]'
            WHERE id = ?
        ")->execute([$this->pharmacyId]);

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
        if ($this->db !== null) {
            $this->db->prepare('DELETE FROM pharmacy_orders WHERE pharmacy_id = ?')->execute([$this->pharmacyId]);
            foreach ($this->requestKeys as $key) {
                $this->db->prepare('DELETE FROM appointment_creation_requests WHERE actor_id = ? AND request_key = ?')
                    ->execute([TestFixtures::PATIENT_A, $key]);
            }
            $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$this->documentId]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->pharmacyId]);
        }
        unset($this->service);
        $this->db = null;
        parent::tearDown();
    }

    public function testReplayWithSameKeyReturnsTheSameOrderAndNotifiesOnce(): void
    {
        $input = $this->input($this->newKey());

        $first = $this->service->create($this->patientA(), $input);
        $this->assertTrue($first['notify']);
        $this->service->markCreationResponseCompleted($this->patientA(), $input);

        $replay = $this->service->create($this->patientA(), $input);

        $this->assertSame($first['order']['id'], $replay['order']['id']);
        $this->assertFalse($replay['notify']);
        $this->assertSame(1, $this->orderCount());
    }

    public function testReplayBeforeTheResponseWasServedStillNotifies(): void
    {
        $input = $this->input($this->newKey());

        $first = $this->service->create($this->patientA(), $input);
        $replay = $this->service->create($this->patientA(), $input);

        $this->assertSame($first['order']['id'], $replay['order']['id']);
        $this->assertTrue($replay['notify']);
        $this->assertSame(1, $this->orderCount());
    }

    public function testSameKeyWithDifferentContentIsAConflict(): void
    {
        $key = $this->newKey();
        $this->service->create($this->patientA(), $this->input($key));

        try {
            $this->service->create($this->patientA(), ['requester_comment' => 'Autre boîte'] + $this->input($key));
            $this->fail('Contenu différent accepté pour la même clé');
        } catch (AppointmentCreationConflict) {
            $this->assertSame(1, $this->orderCount());
        }
    }

    public function testInvalidKeyIsRejectedWithoutCreatingAnything(): void
    {
        try {
            $this->service->create($this->patientA(), $this->input('court'));
            $this->fail('Clé invalide acceptée');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('client_request_id invalide', $e->getMessage());
        }
        $this->assertSame(0, $this->orderCount());
    }

    /** @return array<string, mixed> */
    private function input(string $requestKey): array
    {
        return [
            'client_request_id' => $requestKey,
            'patient_id' => TestFixtures::PATIENT_A,
            'pharmacy_id' => $this->pharmacyId,
            'fulfillment_mode' => 'click_collect',
            'desired_fulfillment_date' => (new DateTimeImmutable('tomorrow', new DateTimeZone('Europe/Paris')))->format('Y-m-d'),
            'prescription_document_ids' => [$this->documentId],
            'requester_comment' => 'Boîte de 30',
        ];
    }

    private function newKey(): string
    {
        $key = 'phpunit-' . bin2hex(random_bytes(8));
        $this->requestKeys[] = $key;

        return $key;
    }

    /** @return array{user_id: string, role: string} */
    private function patientA(): array
    {
        return ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];
    }

    private function orderCount(): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM pharmacy_orders WHERE pharmacy_id = ?');
        $stmt->execute([$this->pharmacyId]);

        return (int) $stmt->fetchColumn();
    }
}
