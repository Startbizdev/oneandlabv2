<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';

/**
 * Adoption lookup + génération d'ordonnance (skip si PDO / fixtures absents).
 */
final class PrescriptionAdoptAccessTest extends TestCase
{
    private ?PDO $db = null;
    private ?User $userModel = null;
    /** @var list<string> */
    private array $profileIds = [];

    protected function tearDown(): void
    {
        if ($this->db !== null) {
            foreach ($this->profileIds as $id) {
                $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ? OR professional_id = ?')->execute([$id, $id]);
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        $this->db = null;
        $this->userModel = null;
        parent::tearDown();
    }

    protected function setUp(): void
    {
        try {
            $config = require __DIR__ . '/../../config/database.php';
            $this->db = new PDO(
                sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset']
                ),
                $config['username'],
                $config['password'],
                $config['options'] ?? []
            );
            $this->userModel = new User();
        } catch (Throwable $e) {
            $this->markTestSkipped('DB unavailable: ' . $e->getMessage());
        }
    }

    public function testAdoptRejectsNonStaffRequester(): void
    {
        $stmt = $this->db->query("SELECT id FROM profiles WHERE role = 'patient' LIMIT 1");
        $patientId = (string) ($stmt->fetchColumn() ?: '');
        if ($patientId === '') {
            $this->markTestSkipped('No patient profile');
        }

        $result = $this->userModel->adoptPatientForStaff($patientId, 'patient', $patientId);
        $this->assertFalse($result['ok']);
        $this->assertSame(403, $result['http'] ?? 0);
    }

    public function testAdoptRejectsNonPatientTarget(): void
    {
        $nurseStmt = $this->db->query("SELECT id FROM profiles WHERE role = 'nurse' LIMIT 1");
        $nurseId = (string) ($nurseStmt->fetchColumn() ?: '');
        $proStmt = $this->db->query("SELECT id FROM profiles WHERE role = 'pro' LIMIT 1");
        $proId = (string) ($proStmt->fetchColumn() ?: '');
        if ($nurseId === '' || $proId === '') {
            $this->markTestSkipped('No nurse/pro profile');
        }

        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $proId);
        $this->assertFalse($result['ok']);
        $this->assertSame(403, $result['http'] ?? 0);
    }

    /**
     * Règle d'adoption : un id seul ne suffit plus (n'importe quel professionnel pouvait rattacher
     * n'importe quel dossier). Il faut rejouer la recherche exacte par contact et le consentement.
     */
    public function testAdoptByBareIdIsRefusedWithoutPriorLink(): void
    {
        [$nurseId, $patientId] = $this->freshNurseAndPatient();

        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $patientId);

        $this->assertFalse($result['ok']);
        $this->assertSame(403, $result['http'] ?? 0);
        $this->assertSame('PATIENT_LOOKUP_MISMATCH', $result['code'] ?? '');
        $this->assertFalse($this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId));
    }

    public function testAdoptRefusesContactOfAnotherPatient(): void
    {
        [$nurseId, $patientId] = $this->freshNurseAndPatient();
        $otherPatientId = TestFixtures::insertProfile($this->db, 'patient');
        $this->profileIds[] = $otherPatientId;

        $result = $this->userModel->adoptPatientForStaff(
            $nurseId,
            'nurse',
            $patientId,
            'patient-' . $otherPatientId . '@test.invalid',
            '',
            true
        );

        $this->assertFalse($result['ok']);
        $this->assertSame('PATIENT_LOOKUP_MISMATCH', $result['code'] ?? '');
        $this->assertFalse($this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId));
    }

    public function testAdoptRequiresPatientConsent(): void
    {
        [$nurseId, $patientId] = $this->freshNurseAndPatient();

        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $patientId, $this->emailOf($patientId), '', false);

        $this->assertFalse($result['ok']);
        $this->assertSame(400, $result['http'] ?? 0);
        $this->assertSame('PATIENT_BOOKING_CONSENT_REQUIRED', $result['code'] ?? '');
        $this->assertFalse($this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId));
    }

    public function testAdoptWithMatchingLookupCreatesPpaAndAllowsPrescriptionGenerate(): void
    {
        [$nurseId, $patientId] = $this->freshNurseAndPatient();
        $otherNurseId = TestFixtures::insertProfile($this->db, 'nurse');
        $this->profileIds[] = $otherNurseId;

        require_once __DIR__ . '/../../lib/PrescriptionService.php';

        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $patientId, $this->emailOf($patientId), '', true);
        $this->assertTrue($result['ok']);
        $this->assertTrue($result['consent_recorded'] ?? false);
        $this->assertTrue($this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId));
        $this->assertTrue(PrescriptionService::canGenerateForPatient(
            ['user_id' => $nurseId, 'role' => 'nurse'],
            $patientId,
            $this->db
        ));
        $this->assertFalse(PrescriptionService::canGenerateForPatient(
            ['user_id' => $otherNurseId, 'role' => 'nurse'],
            $patientId,
            $this->db
        ));
    }

    public function testAdoptIsIdempotentForAlreadyLinkedProfessional(): void
    {
        [$nurseId, $patientId] = $this->freshNurseAndPatient();
        $this->userModel->linkPatientProfessional($patientId, $nurseId, null, 'created');

        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $patientId);

        $this->assertTrue($result['ok']);
        $this->assertArrayNotHasKey('consent_recorded', $result);
    }

    /** @return array{0: string, 1: string} */
    private function freshNurseAndPatient(): array
    {
        $nurseId = TestFixtures::insertProfile($this->db, 'nurse');
        $patientId = TestFixtures::insertProfile($this->db, 'patient');
        $this->profileIds[] = $nurseId;
        $this->profileIds[] = $patientId;

        return [$nurseId, $patientId];
    }

    private function emailOf(string $profileId): string
    {
        return 'patient-' . $profileId . '@test.invalid';
    }
}
