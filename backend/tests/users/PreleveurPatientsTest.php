<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../lib/LabTeamAccess.php';

use PHPUnit\Framework\TestCase;

/**
 * Liste « Mes patients » du préleveur : patients créés par lui ou assignés par son labo.
 */
final class PreleveurPatientsTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $users;
    /** @var list<string> */
    private array $patientIds = [];
    /** @var list<string> préleveurs avant labos (FK lab_id) */
    private array $extraProfileIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->users = new User($this->db);
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->patientIds as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
            foreach (array_reverse($this->extraProfileIds) as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
            $this->db->prepare('DELETE FROM patient_professional_access WHERE professional_id = ? AND source = ?')
                ->execute([TestFixtures::PRELEVEUR, 'lab_assignment']);
        }
        parent::tearDown();
    }

    public function testPreleveurLabIdIsResolved(): void
    {
        $this->assertSame(TestFixtures::LAB, $this->users->getPreleveurLabId(TestFixtures::PRELEVEUR));
        $this->assertNull($this->users->getPreleveurLabId(TestFixtures::NURSE));
    }

    public function testCreatedPatientIsVisibleToPreleveurAndToItsLab(): void
    {
        $patientId = $this->createPatient();

        $this->assertTrue($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', $patientId));
        $this->assertTrue($this->users->isPatientVisibleInStaffList(TestFixtures::LAB, 'lab', $patientId));
        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::NURSE, 'nurse', $patientId));

        $stmt = $this->db->prepare('SELECT created_by FROM profiles WHERE id = ?');
        $stmt->execute([$patientId]);
        $this->assertSame(TestFixtures::PRELEVEUR, $stmt->fetchColumn());

        $stmt = $this->db->prepare('SELECT source FROM patient_professional_access WHERE patient_id = ? AND professional_id = ?');
        $stmt->execute([$patientId, TestFixtures::LAB]);
        $this->assertSame('lab_assignment', $stmt->fetchColumn());
    }

    public function testPatientCreationIsRolledBackWhenLabLinkFails(): void
    {
        $missingLab = '00000000-0000-4000-8000-0000000fffff';
        $email = 'prel-rollback-' . bin2hex(random_bytes(4)) . '@test.invalid';
        $error = null;
        try {
            $this->users->createPatientForPreleveur($this->patientData($email), TestFixtures::PRELEVEUR, $missingLab);
        } catch (RuntimeException $e) {
            $error = $e;
        }
        $this->assertInstanceOf(RuntimeException::class, $error, 'Le lien labo invalide doit faire échouer la création.');
        $this->assertNull($this->users->findPatientIdByEmailHash(hash('sha256', $email)));
    }

    public function testPreleveurListIsScopedToCreatedOrAssignedPatients(): void
    {
        $patientId = $this->createPatient();
        $listed = $this->users->getAll(['role' => 'patient', 'created_by' => TestFixtures::PRELEVEUR], 1, 100, TestFixtures::PRELEVEUR, 'preleveur');
        $ids = array_column($listed['data'], 'id');

        $this->assertContains($patientId, $ids);
        $this->assertNotContains(TestFixtures::PATIENT_B, $ids);
        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', TestFixtures::PATIENT_B));
    }

    public function testLabAssignmentGrantsAndRevokesVisibility(): void
    {
        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', TestFixtures::PATIENT_B));

        $this->users->assignPatientToPreleveur(TestFixtures::PATIENT_B, TestFixtures::PRELEVEUR);
        $this->assertTrue($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', TestFixtures::PATIENT_B));
        $this->assertContains(
            TestFixtures::PATIENT_B,
            array_column($this->users->listPreleveurAssignments(TestFixtures::PRELEVEUR), 'patient_id')
        );

        $this->assertTrue($this->users->removePreleveurAssignment(TestFixtures::PRELEVEUR, TestFixtures::PATIENT_B));
        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', TestFixtures::PATIENT_B));
        $this->assertFalse($this->users->removePreleveurAssignment(TestFixtures::PRELEVEUR, TestFixtures::PATIENT_B));
    }

    public function testRemovingAssignmentKeepsPatientsCreatedByPreleveur(): void
    {
        $patientId = $this->createPatient();
        $this->assertFalse($this->users->removePreleveurAssignment(TestFixtures::PRELEVEUR, $patientId));
        $this->assertTrue($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', $patientId));
    }

    public function testAssignmentIsLimitedToOwnTeamPreleveurAndPatients(): void
    {
        $otherLab = $this->insertProfile('lab', null);
        $otherPreleveur = $this->insertProfile('preleveur', $otherLab);
        $otherPatient = $this->users->createPatientForPreleveur($this->patientData(''), $otherPreleveur, $otherLab);
        $this->patientIds[] = $otherPatient;

        $this->assertTrue(LabTeamAccess::isPreleveurOfTeam($this->db, TestFixtures::LAB, 'lab', TestFixtures::PRELEVEUR));
        $this->assertTrue(LabTeamAccess::isPreleveurOfTeam($this->db, TestFixtures::SUBACCOUNT, 'subaccount', TestFixtures::PRELEVEUR));
        $this->assertFalse(LabTeamAccess::isPreleveurOfTeam($this->db, TestFixtures::LAB, 'lab', $otherPreleveur));
        $this->assertFalse(LabTeamAccess::isPreleveurOfTeam($this->db, $otherLab, 'lab', TestFixtures::PRELEVEUR));
        $this->assertFalse(LabTeamAccess::isPreleveurOfTeam($this->db, TestFixtures::LAB, 'lab', TestFixtures::SUBACCOUNT));

        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::LAB, 'lab', $otherPatient));
        $this->assertTrue($this->users->isPatientVisibleInStaffList($otherLab, 'lab', $otherPatient));
        $this->assertFalse($this->users->isPatientVisibleInStaffList(TestFixtures::PRELEVEUR, 'preleveur', $otherPatient));
    }

    private function insertProfile(string $role, ?string $labId): string
    {
        $id = TestFixtures::insertProfile($this->db, $role, $labId);
        $this->extraProfileIds[] = $id;

        return $id;
    }

    private function createPatient(): string
    {
        $patientId = $this->users->createPatientForPreleveur(
            $this->patientData(''),
            TestFixtures::PRELEVEUR,
            TestFixtures::LAB
        );
        $this->patientIds[] = $patientId;

        return $patientId;
    }

    /** @return array<string, mixed> */
    private function patientData(string $email): array
    {
        return [
            'email' => $email,
            'first_name' => 'Prel' . bin2hex(random_bytes(3)),
            'last_name' => 'Patient',
            'phone' => '0612345678',
            'role' => 'patient',
            'created_by' => TestFixtures::PRELEVEUR,
        ];
    }
}
