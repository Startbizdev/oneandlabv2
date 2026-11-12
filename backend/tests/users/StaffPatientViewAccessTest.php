<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Consultation de la fiche patient (GET /users/{id}) : labo assigné et pro destinataire d'un RDV,
 * qui recevaient « Fiche patient indisponible ».
 */
final class StaffPatientViewAccessTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $userModel;
    /** @var list<string> */
    private array $profileIds = [];
    /** @var list<string> */
    private array $appointmentIds = [];

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
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        foreach ($this->profileIds as $id) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->userModel, $this->db);
        parent::tearDown();
    }

    public function testAssignedLabCanViewThePatientButNotEditIt(): void
    {
        $patient = $this->newProfile('patient');
        $lab = $this->newProfile('lab');
        $this->assertFalse($this->userModel->canStaffViewPatientProfile($lab, 'lab', $patient));

        $this->insertAppointment($patient, 'pending', ['assigned_lab_id' => $lab]);

        $this->assertTrue($this->userModel->canStaffViewPatientProfile($lab, 'lab', $patient));
        $this->assertFalse($this->userModel->canStaffEditPatientProfile($lab, 'lab', $patient));
    }

    public function testProToWhomAPendingAppointmentIsAddressedCanViewThePatient(): void
    {
        $patient = $this->newProfile('patient');
        $pro = $this->newProfile('pro');
        $otherPro = $this->newProfile('pro');

        $this->insertAppointment($patient, 'pending', ['assigned_pro_id' => $pro]);

        $this->assertTrue($this->userModel->canStaffViewPatientProfile($pro, 'pro', $patient));
        $this->assertFalse($this->userModel->canStaffViewPatientProfile($otherPro, 'pro', $patient));
    }

    private function newProfile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profileIds[] = $id;

        return $id;
    }

    /** @param array<string, string> $assignment */
    private function insertAppointment(string $patient, string $status, array $assignment): void
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
        $columns = implode(', ', array_keys($assignment));
        $placeholders = implode(', ', array_fill(0, count($assignment), '?'));
        $this->db->prepare(
            "INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id, $columns
            ) VALUES (?, 'blood_test', ?, ?, 'patient', 'blood_test', 48.86, 2.35, 'fixture-addr', 'fixture-dek', NOW(), ?, $placeholders)"
        )->execute([$id, $status, $patient, $patient, ...array_values($assignment)]);
        $this->appointmentIds[] = $id;
    }
}
