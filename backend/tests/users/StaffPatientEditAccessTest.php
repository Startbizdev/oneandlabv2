<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Périmètre d'édition patient staff (fixtures Docker).
 */
final class StaffPatientEditAccessTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $userModel;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->userModel = new User($this->db);
    }

    protected function tearDown(): void
    {
        unset($this->userModel, $this->db);
        parent::tearDown();
    }

    public function testCanStaffEditPatientProfileRejectsNonPatientTarget(): void
    {
        $this->assertFalse(
            $this->userModel->canStaffEditPatientProfile(TestFixtures::PRO, 'pro', TestFixtures::PRO)
        );
    }

    public function testVisiblePatientInStaffListIsEditable(): void
    {
        $proId = TestFixtures::PRO;
        $patientId = TestFixtures::PATIENT_A;

        if ($this->db->query("SHOW TABLES LIKE 'patient_professional_access'")->fetch()) {
            $id = sprintf('00000000-0000-4000-8000-%012x', random_int(0, 0xffffffff));
            $stmt = $this->db->prepare(
                'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
                 VALUES (?, ?, ?, ?, NULL, NOW())'
            );
            $stmt->execute([$id, $patientId, $proId, 'manual_link']);
        }

        $this->assertTrue($this->userModel->isPatientVisibleInStaffList($proId, 'pro', $patientId));
        $this->assertTrue($this->userModel->canStaffEditPatientProfile($proId, 'pro', $patientId));
    }
}
