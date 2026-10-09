<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/health/PatientPhoneService.php';

use PHPUnit\Framework\TestCase;

final class PatientPhoneServiceTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private PatientPhoneService $service;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->service = new PatientPhoneService($this->db);
        $this->db->prepare('DELETE FROM patient_phones WHERE patient_id IN (?, ?)')
            ->execute([TestFixtures::PATIENT_A, TestFixtures::PATIENT_B]);
    }

    protected function tearDown(): void
    {
        unset($this->service, $this->db);
        parent::tearDown();
    }

    public function testNormalizePhoneKeepsInputAndRejectsInvalidNumbers(): void
    {
        $this->assertSame('+33 6 12 34 56 78', PatientPhoneService::normalizePhone("  +33 6  12 34 56 78 "));
        foreach (['', 'abc', '12345', '+33 6 12 34 56 78 90 12 34'] as $invalid) {
            try {
                PatientPhoneService::normalizePhone($invalid);
                $this->fail('Numéro accepté à tort : ' . $invalid);
            } catch (InvalidArgumentException $e) {
                $this->assertNotSame('', $e->getMessage());
            }
        }
    }

    public function testNurseWithDossierAccessAddsEncryptedPhoneThenDeletesIt(): void
    {
        $this->grantAccess(TestFixtures::NURSE, TestFixtures::PATIENT_A);
        $nurse = ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'];

        $sessionZone = (string) $this->db->query('SELECT @@session.time_zone')->fetchColumn();
        $this->db->exec("SET time_zone = '+05:00'");
        try {
            $created = $this->service->create($nurse, TestFixtures::PATIENT_A, ['label' => 'aidant', 'phone' => '06 11 22 33 44']);
        } finally {
            $this->db->prepare('SET time_zone = ?')->execute([$sessionZone]);
        }

        $this->assertEqualsWithDelta(time(), strtotime($created['created_at']), 120, 'Instant réel, quel que soit le fuseau MySQL');
        $this->assertSame('aidant', $created['label']);
        $this->assertSame('06 11 22 33 44', $created['phone']);

        $raw = $this->db->prepare('SELECT phone_encrypted, phone_dek, created_by FROM patient_phones WHERE id = ?');
        $raw->execute([$created['id']]);
        $row = $raw->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row);
        $this->assertStringNotContainsString('11 22 33', (string) $row['phone_encrypted']);
        $this->assertStringNotContainsString('0611223344', (string) $row['phone_encrypted']);
        $this->assertNotSame('', (string) $row['phone_dek']);
        $this->assertSame(TestFixtures::NURSE, $row['created_by']);

        $list = $this->service->listForPatient($nurse, TestFixtures::PATIENT_A);
        $this->assertSame([$created['id']], array_column($list, 'id'));
        $this->assertSame('06 11 22 33 44', $list[0]['phone']);

        $this->service->delete($nurse, TestFixtures::PATIENT_A, $created['id']);
        $this->assertSame([], $this->service->listForPatient($nurse, TestFixtures::PATIENT_A));
    }

    public function testPatientManagesOwnPhonesButNotAnotherPatients(): void
    {
        $patientA = ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];
        $patientB = ['user_id' => TestFixtures::PATIENT_B, 'role' => 'patient'];

        $created = $this->service->create($patientA, TestFixtures::PATIENT_A, ['label' => 'fixe', 'phone' => '01 23 45 67 89']);
        $this->assertSame('fixe', $created['label']);

        $this->assertForbidden(fn () => $this->service->listForPatient($patientB, TestFixtures::PATIENT_A));
        $this->assertForbidden(fn () => $this->service->delete($patientB, TestFixtures::PATIENT_A, $created['id']));
    }

    public function testStaffWithoutDossierAccessIsRefused(): void
    {
        $this->db->prepare('DELETE FROM patient_professional_access WHERE professional_id = ? AND patient_id = ?')
            ->execute([TestFixtures::PRO, TestFixtures::PATIENT_B]);
        $pro = ['user_id' => TestFixtures::PRO, 'role' => 'pro'];

        if (PatientDossierAccess::canAccess($this->db, new User($this->db), $pro, TestFixtures::PATIENT_B)) {
            $this->markTestSkipped('Les fixtures rattachent déjà le médecin au patient B');
        }

        $this->assertForbidden(fn () => $this->service->listForPatient($pro, TestFixtures::PATIENT_B));
        $this->assertForbidden(fn () => $this->service->create($pro, TestFixtures::PATIENT_B, ['label' => 'mobile', 'phone' => '0612345678']));
    }

    public function testLabRoleCannotAddPhone(): void
    {
        $lab = ['user_id' => TestFixtures::LAB, 'role' => 'lab'];

        $this->expectException(HttpStatusException::class);
        $this->expectExceptionMessage('Modification des numéros non autorisée');

        $this->service->create($lab, TestFixtures::PATIENT_A, ['label' => 'mobile', 'phone' => '0612345678']);
    }

    public function testInvalidLabelIsRejectedBeforeWrite(): void
    {
        $patientA = ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Type de numéro invalide');

        $this->service->create($patientA, TestFixtures::PATIENT_A, ['label' => 'bureau', 'phone' => '0612345678']);
    }

    public function testDeletingAnotherPatientsPhoneIdIsNotFound(): void
    {
        $patientA = ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'];
        $patientB = ['user_id' => TestFixtures::PATIENT_B, 'role' => 'patient'];
        $phoneOfB = $this->service->create($patientB, TestFixtures::PATIENT_B, ['label' => 'mobile', 'phone' => '0699887766']);

        $this->expectException(HttpStatusException::class);
        $this->expectExceptionMessage('Numéro introuvable');

        $this->service->delete($patientA, TestFixtures::PATIENT_A, $phoneOfB['id']);
    }

    private function grantAccess(string $professionalId, string $patientId): void
    {
        $this->db->prepare(
            'INSERT IGNORE INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, ?, NULL, NOW())'
        )->execute([
            sprintf('00000000-0000-4000-8000-%012x', random_int(0, 0xffffffff)),
            $patientId,
            $professionalId,
            'manual_link',
        ]);
    }

    private function assertForbidden(callable $call): void
    {
        try {
            $call();
            $this->fail('Accès attendu refusé');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
    }
}
