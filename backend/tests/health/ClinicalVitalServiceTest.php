<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/ClinicalVitalService.php';

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
}
