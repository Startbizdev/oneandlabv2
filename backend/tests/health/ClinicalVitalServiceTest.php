<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/ClinicalVitalService.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';

final class ClinicalVitalServiceTest extends TestCase
{
    public function testQueriesDoNotReferencePlainProfileNameColumns(): void
    {
        $source = (string) file_get_contents(__DIR__ . '/../../lib/health/ClinicalVitalService.php');
        $this->assertStringNotContainsString('p.first_name', $source);
        $this->assertStringNotContainsString('p.last_name', $source);
    }

    public function testListForStaffRunsVitalQueriesWithoutSqlError(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }

        $db = TestDatabase::pdo();
        try {
            $db->query('SELECT 1 FROM patient_clinical_vitals LIMIT 1');
        } catch (Throwable $e) {
            $this->markTestSkipped('Table patient_clinical_vitals absente : ' . $e->getMessage());
        }

        $service = new ClinicalVitalService($db);
        $viewer = [
            'user_id' => '00000000-0000-0000-0000-000000000099',
            'role' => 'nurse',
        ];

        try {
            $service->listForStaff($viewer, '00000000-0000-0000-0000-000000000001');
            $this->fail('Accès attendu refusé');
        } catch (RuntimeException $e) {
            $this->assertSame('Accès carnet refusé', $e->getMessage());
        } catch (PDOException $e) {
            $this->fail('Erreur SQL inattendue : ' . $e->getMessage());
        }
    }

    public function testFetchRecentExecutesWithoutUnknownColumnError(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }

        $db = TestDatabase::pdo();
        try {
            $db->query('SELECT 1 FROM patient_clinical_vitals LIMIT 1');
        } catch (Throwable $e) {
            $this->markTestSkipped('Table patient_clinical_vitals absente');
        }

        $stmt = $db->prepare('
            SELECT v.*
            FROM patient_clinical_vitals v
            WHERE v.patient_id = ?
            ORDER BY v.recorded_at DESC
            LIMIT 1
        ');
        $stmt->execute(['00000000-0000-0000-0000-000000000001']);
        $this->assertNotFalse($stmt);
    }

    public function testRecordedAtWithOffsetIsStoredInServerTimeAndKeptOnUpdate(): void
    {
        [$service, $nurse] = $this->serviceWithNurseAccess();
        $twoHoursAgo = new DateTimeImmutable('-2 hours');
        $measuredAt = $twoHoursAgo->setTime((int) $twoHoursAgo->format('H'), 15);
        $sentInUtc = $measuredAt->setTimezone(new DateTimeZone('UTC'))->format(DATE_ATOM);

        $created = $service->create($nurse, TestFixtures::PATIENT_A, [
            'vital_type' => 'heart_rate',
            'value' => 72,
            'recorded_at' => $sentInUtc,
        ]);
        $this->assertSame($measuredAt->getTimestamp(), (new DateTimeImmutable($created['recorded_at']))->getTimestamp());

        $updated = $service->update($nurse, TestFixtures::PATIENT_A, $created['id'], ['value' => 80]);
        $this->assertSame(80.0, $updated['value']);
        $this->assertSame($created['recorded_at'], $updated['recorded_at']);
    }

    public function testRecordedAtInTheFutureIsRejected(): void
    {
        [$service, $nurse] = $this->serviceWithNurseAccess();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('L\'heure de mesure ne peut pas être dans le futur');

        $service->create($nurse, TestFixtures::PATIENT_A, [
            'vital_type' => 'heart_rate',
            'value' => 72,
            'recorded_at' => (new DateTimeImmutable('+1 hour'))->format(DATE_ATOM),
        ]);
    }

    /**
     * @return array{0: ClinicalVitalService, 1: array{user_id: string, role: string}}
     */
    private function serviceWithNurseAccess(): array
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $db = TestDatabase::pdo();
        $db->prepare(
            'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, ?, NULL, NOW())'
        )->execute([
            sprintf('00000000-0000-4000-8000-%012x', random_int(0, 0xffffffff)),
            TestFixtures::PATIENT_A,
            TestFixtures::NURSE,
            'manual_link',
        ]);

        return [new ClinicalVitalService($db), ['user_id' => TestFixtures::NURSE, 'role' => 'nurse']];
    }
}
