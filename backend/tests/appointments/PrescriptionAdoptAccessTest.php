<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';

/**
 * Adoption lookup + génération d'ordonnance (skip si PDO / fixtures absents).
 */
final class PrescriptionAdoptAccessTest extends TestCase
{
    private ?PDO $db = null;
    private ?User $userModel = null;

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

    public function testAdoptCreatesPpaAndAllowsPrescriptionGenerate(): void
    {
        $nurseStmt = $this->db->query("SELECT id FROM profiles WHERE role = 'nurse' LIMIT 1");
        $nurseId = (string) ($nurseStmt->fetchColumn() ?: '');
        $patientStmt = $this->db->query("SELECT id FROM profiles WHERE role = 'patient' LIMIT 1");
        $patientId = (string) ($patientStmt->fetchColumn() ?: '');
        if ($nurseId === '' || $patientId === '') {
            $this->markTestSkipped('No nurse/patient profile');
        }

        $otherNurseStmt = $this->db->prepare(
            "SELECT id FROM profiles WHERE role = 'nurse' AND id <> ? LIMIT 1"
        );
        $otherNurseStmt->execute([$nurseId]);
        $otherNurseId = (string) ($otherNurseStmt->fetchColumn() ?: '');

        require_once __DIR__ . '/../../lib/PrescriptionService.php';

        $hadAccess = $this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId);
        $result = $this->userModel->adoptPatientForStaff($nurseId, 'nurse', $patientId);
        $this->assertTrue($result['ok']);
        $this->assertTrue($this->userModel->hasProfessionalAccessToPatient($nurseId, $patientId));
        $this->assertTrue(PrescriptionService::canGenerateForPatient(
            ['user_id' => $nurseId, 'role' => 'nurse'],
            $patientId,
            $this->db
        ));

        if ($otherNurseId !== '') {
            $otherVisible = $this->userModel->isPatientVisibleInStaffList($otherNurseId, 'nurse', $patientId)
                || $this->userModel->hasProfessionalAccessToPatient($otherNurseId, $patientId);
            if (!$otherVisible) {
                $this->assertFalse(PrescriptionService::canGenerateForPatient(
                    ['user_id' => $otherNurseId, 'role' => 'nurse'],
                    $patientId,
                    $this->db
                ));
            }
        }

        if (!$hadAccess) {
            try {
                $del = $this->db->prepare(
                    'DELETE FROM patient_professional_access WHERE patient_id = ? AND professional_id = ? AND source = ?'
                );
                $del->execute([$patientId, $nurseId, 'manual_link']);
            } catch (Throwable $e) {
                /* cleanup best-effort */
            }
        }
    }
}
