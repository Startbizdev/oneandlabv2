<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/Uuid.php';
require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/HealthService.php';
require_once __DIR__ . '/../../lib/health/ClinicalVitalService.php';
require_once __DIR__ . '/../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../lib/nurse-tour/PatientAbsenceService.php';

/**
 * Les refus métier des services portent leur statut HTTP (les endpoints ne déduisent plus le statut du texte).
 */
final class HttpStatusExceptionMappingTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    public function testFactoriesCarryStatusAndCode(): void
    {
        $this->assertSame([403, 'FORBIDDEN'], $this->statusOf(HttpStatusException::forbidden('x')));
        $this->assertSame([404, 'NOT_FOUND'], $this->statusOf(HttpStatusException::notFound('x')));
        $this->assertSame([409, 'manual_order_locked'], $this->statusOf(HttpStatusException::conflict('x', 'manual_order_locked')));
        $this->assertInstanceOf(RuntimeException::class, HttpStatusException::notFound('x'));
    }

    public function testUnknownDeviceIsNotFound(): void
    {
        $this->assertHttpStatus(
            static fn (PDO $db) => (new HealthService($db))->getDevice(TestFixtures::PATIENT_A, Uuid::v4()),
            404,
            'Appareil introuvable'
        );
    }

    public function testStaffWithoutLinkIsForbiddenOnClinicalVitals(): void
    {
        $this->assertHttpStatus(
            static fn (PDO $db) => (new ClinicalVitalService($db))->listForStaff(['user_id' => Uuid::v4(), 'role' => 'nurse'], TestFixtures::PATIENT_A),
            403,
            'Accès carnet refusé'
        );
    }

    public function testNurseWithoutLinkIsForbiddenOnAbsences(): void
    {
        $nurse = Uuid::v4();
        $this->assertHttpStatus(
            static fn (PDO $db) => (new PatientAbsenceService($db))->create($nurse, TestFixtures::PATIENT_A, $nurse, [
                'absence_type' => 'hospitalization',
                'start_date' => '2030-01-01',
                'end_date' => '2030-01-02',
            ]),
            403,
            'Accès patient refusé'
        );
    }

    private function assertHttpStatus(callable $call, int $status, string $message): void
    {
        try {
            $call($this->db);
            $this->fail('HttpStatusException attendue');
        } catch (HttpStatusException $e) {
            $this->assertSame($status, $e->httpStatus);
            $this->assertSame($message, $e->getMessage());
        }
    }

    /**
     * @return array{0: int, 1: string}
     */
    private function statusOf(HttpStatusException $e): array
    {
        return [$e->httpStatus, $e->errorCode];
    }
}
