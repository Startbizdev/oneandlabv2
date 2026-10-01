<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentCreateInputPolicy.php';

/**
 * Création de RDV : statut, patient et assignations sont décidés par le serveur, jamais repris du client.
 */
final class AppointmentCreateInputPolicyTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $profileIds = [];
    /** @var list<string> */
    private array $appointmentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        foreach (array_reverse($this->profileIds) as $id) {
            $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ? OR professional_id = ?')->execute([$id, $id]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testPatientForgedStatusIsIgnoredAndPatientForcedToSelf(): void
    {
        $out = $this->apply(TestFixtures::PATIENT_A, 'patient', ['type' => 'blood_test', 'status' => 'confirmed']);

        $this->assertArrayNotHasKey('status', $out);
        $this->assertSame(TestFixtures::PATIENT_A, $out['patient_id']);
    }

    public function testPatientCannotBookForAnotherPatient(): void
    {
        $this->assertDenied(403, 'PATIENT_ACCESS_DENIED', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'blood_test',
            'patient_id' => TestFixtures::PATIENT_B,
        ]);
    }

    public function testPatientCannotChooseThePreleveur(): void
    {
        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'blood_test',
            'assigned_to' => TestFixtures::PRELEVEUR,
        ]);
    }

    public function testPatientPublicProfileNurseMustBeAnActiveNurseForNursing(): void
    {
        $out = $this->apply(TestFixtures::PATIENT_A, 'patient', ['type' => 'nursing', 'assigned_nurse_id' => TestFixtures::NURSE]);
        $this->assertSame(TestFixtures::NURSE, $out['assigned_nurse_id']);

        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'nursing',
            'assigned_nurse_id' => TestFixtures::PRO,
        ]);
        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'blood_test',
            'assigned_nurse_id' => TestFixtures::NURSE,
        ]);

        $banned = $this->profile('nurse');
        $this->db->prepare('UPDATE profiles SET banned_until = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?')->execute([$banned]);
        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'nursing',
            'assigned_nurse_id' => $banned,
        ]);
    }

    public function testInvalidAssignmentIdIsAValidationError(): void
    {
        $this->assertDenied(400, 'VALIDATION_ERROR', TestFixtures::PATIENT_A, 'patient', [
            'type' => 'nursing',
            'assigned_nurse_id' => 'pas-un-uuid',
        ]);
    }

    public function testProNeedsALegitimateLinkToThePatient(): void
    {
        $pro = $this->profile('pro');
        $stranger = $this->profile('patient');
        $this->assertDenied(403, 'PATIENT_ACCESS_DENIED', $pro, 'pro', ['type' => 'blood_test', 'patient_id' => $stranger]);

        $own = $this->patientCreatedBy($pro);
        $out = $this->apply($pro, 'pro', ['type' => 'blood_test', 'patient_id' => $own, 'status' => 'completed']);
        $this->assertSame($own, $out['patient_id']);
        $this->assertArrayNotHasKey('status', $out);
    }

    public function testProCannotAssignANurseUnlinkedToThePatient(): void
    {
        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);

        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', $pro, 'pro', [
            'type' => 'nursing',
            'patient_id' => $patient,
            'assigned_nurse_id' => TestFixtures::NURSE,
        ]);
    }

    public function testProCanOnlyAssignHimselfAsPro(): void
    {
        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);

        $out = $this->apply($pro, 'pro', ['type' => 'blood_test', 'patient_id' => $patient, 'assigned_pro_id' => $pro]);
        $this->assertSame($pro, $out['assigned_pro_id']);

        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', $pro, 'pro', [
            'type' => 'blood_test',
            'patient_id' => $patient,
            'assigned_pro_id' => TestFixtures::PRO,
        ]);
    }

    /**
     * Décision métier : la reprogrammation par un pro repart en attente et repasse par les offres.
     * Même avec un RDV source confirmé chez ce labo, labo, préleveur et statut ne sont pas repris.
     */
    public function testProRescheduleGoesBackToPendingWithoutLabOrPreleveur(): void
    {
        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);
        $this->sourceAppointment($patient, $pro, 'confirmed');

        $out = $this->apply($pro, 'pro', [
            'type' => 'blood_test',
            'patient_id' => $patient,
            'status' => 'confirmed',
            'assigned_lab_id' => TestFixtures::LAB,
            'assigned_to' => TestFixtures::PRELEVEUR,
        ]);

        $this->assertSame($patient, $out['patient_id']);
        $this->assertArrayNotHasKey('status', $out);
        $this->assertArrayNotHasKey('assigned_lab_id', $out);
        $this->assertArrayNotHasKey('assigned_to', $out);
    }

    public function testNurseBloodTestRequestNeverKeepsALab(): void
    {
        $out = $this->apply(TestFixtures::NURSE, 'nurse', [
            'type' => 'blood_test',
            'assigned_lab_id' => TestFixtures::LAB,
            'assigned_to' => TestFixtures::PRELEVEUR,
        ]);

        $this->assertArrayNotHasKey('assigned_lab_id', $out);
        $this->assertArrayNotHasKey('assigned_to', $out);
    }

    public function testClientAttributionQrIsAlwaysDropped(): void
    {
        $qrLike = '00000000-0000-4000-8000-0000000c0de1';

        $this->assertArrayNotHasKey('attribution_qr_id', $this->apply(TestFixtures::PATIENT_A, 'patient', ['type' => 'blood_test', 'attribution_qr_id' => $qrLike]));
        $this->assertArrayNotHasKey('attribution_qr_id', $this->apply(TestFixtures::ADMIN, 'super_admin', ['type' => 'blood_test', 'attribution_qr_id' => $qrLike]));
    }

    public function testSkipZoneDispatchIsDroppedOutsideLegitimateCases(): void
    {
        $this->assertArrayNotHasKey('skip_zone_dispatch', $this->apply(TestFixtures::PATIENT_A, 'patient', ['type' => 'nursing', 'skip_zone_dispatch' => true]));
        $this->assertArrayNotHasKey('skip_zone_dispatch', $this->apply(TestFixtures::LAB, 'lab', ['type' => 'blood_test', 'skip_zone_dispatch' => true]));

        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);
        $this->assertArrayNotHasKey('skip_zone_dispatch', $this->apply($pro, 'pro', ['type' => 'nursing', 'patient_id' => $patient, 'skip_zone_dispatch' => true]), 'Sans invitation');
        $this->assertArrayNotHasKey('skip_zone_dispatch', $this->apply($pro, 'pro', [
            'type' => 'blood_test',
            'patient_id' => $patient,
            'skip_zone_dispatch' => true,
            'external_nurse_invite' => ['phone' => '0612345678'],
        ]), 'Invitation infirmier sur une prise de sang');
    }

    public function testSkipZoneDispatchKeptForExternalNurseInviteAndItsBatch(): void
    {
        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);
        $withInvite = $this->apply($pro, 'pro', [
            'type' => 'nursing',
            'patient_id' => $patient,
            'skip_zone_dispatch' => true,
            'external_nurse_invite' => ['phone' => '0612345678'],
        ]);
        $this->assertTrue($withInvite['skip_zone_dispatch']);

        $batchId = '00000000-0000-4000-8000-' . substr(bin2hex(random_bytes(6)), 0, 12);
        $sibling = ['type' => 'nursing', 'patient_id' => $patient, 'skip_zone_dispatch' => true, 'creation_batch_id' => $batchId];
        $this->assertArrayNotHasKey('skip_zone_dispatch', $this->apply($pro, 'pro', $sibling), 'Lot sans RDV invité');

        $invited = $this->sourceAppointment($patient, $pro, 'pending', 'nursing');
        $this->db->prepare("UPDATE appointments SET creation_batch_id = ?, dispatch_mode = 'external_invite' WHERE id = ?")->execute([$batchId, $invited]);
        $this->assertTrue($this->apply($pro, 'pro', $sibling)['skip_zone_dispatch']);

        $otherPro = $this->profile('pro');
        $otherPatient = $this->patientCreatedBy($otherPro);
        $this->assertArrayNotHasKey(
            'skip_zone_dispatch',
            $this->apply($otherPro, 'pro', ['patient_id' => $otherPatient] + $sibling),
            'Lot invité par un autre pro'
        );
    }

    public function testExternalNurseInviteIgnoredOutsideProNursing(): void
    {
        $invite = ['phone' => '0612345678'];
        foreach ([
            [TestFixtures::PATIENT_A, 'patient', 'nursing'],
            [TestFixtures::NURSE, 'nurse', 'nursing'],
            [TestFixtures::LAB, 'lab', 'nursing'],
            [TestFixtures::PRELEVEUR, 'preleveur', 'blood_test'],
            [TestFixtures::ADMIN, 'super_admin', 'nursing'],
        ] as [$userId, $role, $type]) {
            $out = $this->apply($userId, $role, ['type' => $type, 'external_nurse_invite' => $invite, 'skip_zone_dispatch' => true]);
            $this->assertArrayNotHasKey('external_nurse_invite', $out, $role);
            if ($role !== 'super_admin') {
                $this->assertArrayNotHasKey('skip_zone_dispatch', $out, $role);
            }
        }

        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);
        $this->assertArrayNotHasKey('external_nurse_invite', $this->apply($pro, 'pro', [
            'type' => 'blood_test',
            'patient_id' => $patient,
            'external_nurse_invite' => $invite,
        ]), 'Prise de sang');
    }

    public function testExternalNurseInvitePhoneIsValidatedAndNormalized(): void
    {
        $pro = $this->profile('pro');
        $patient = $this->patientCreatedBy($pro);
        $nursing = ['type' => 'nursing', 'patient_id' => $patient];

        $out = $this->apply($pro, 'pro', $nursing + ['external_nurse_invite' => ['phone' => '+33 7 12.34-56 78', 'name' => 'ignoré']]);
        $this->assertSame(['phone' => '0712345678'], $out['external_nurse_invite']);

        foreach ([['phone' => '0145678901'], ['phone' => '06123'], ['phone' => '+44 7123 456789'], ['phone' => ['0612345678']], ['phone' => ''], 'oui'] as $bad) {
            $this->assertDenied(400, 'VALIDATION_ERROR', $pro, 'pro', $nursing + ['external_nurse_invite' => $bad]);
        }
    }

    public function testLabAssignsOnlyWithinItsTeam(): void
    {
        $out = $this->apply(TestFixtures::LAB, 'lab', [
            'type' => 'blood_test',
            'assigned_lab_id' => TestFixtures::SUBACCOUNT,
            'assigned_to' => TestFixtures::PRELEVEUR,
        ]);
        $this->assertSame(TestFixtures::SUBACCOUNT, $out['assigned_lab_id']);
        $this->assertSame(TestFixtures::PRELEVEUR, $out['assigned_to']);

        $otherLab = $this->profile('lab');
        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::LAB, 'lab', [
            'type' => 'blood_test',
            'assigned_lab_id' => $otherLab,
        ]);
        $foreignPreleveur = $this->profile('preleveur', $otherLab);
        $this->assertDenied(403, 'ASSIGNMENT_FORBIDDEN', TestFixtures::LAB, 'lab', [
            'type' => 'blood_test',
            'assigned_to' => $foreignPreleveur,
        ]);
    }

    public function testPreleveurAssignmentsAreLeftToItsOwnBranch(): void
    {
        $out = $this->apply(TestFixtures::PRELEVEUR, 'preleveur', [
            'type' => 'blood_test',
            'status' => 'completed',
            'assigned_lab_id' => TestFixtures::LAB,
            'assigned_to' => TestFixtures::PRELEVEUR,
        ]);

        $this->assertArrayNotHasKey('status', $out);
        $this->assertArrayNotHasKey('assigned_lab_id', $out);
        $this->assertArrayNotHasKey('assigned_to', $out);
    }

    public function testSuperAdminInputIsUntouched(): void
    {
        $input = ['type' => 'blood_test', 'status' => 'confirmed', 'patient_id' => TestFixtures::PATIENT_B, 'assigned_to' => TestFixtures::PRELEVEUR];

        $this->assertSame($input, $this->apply(TestFixtures::ADMIN, 'super_admin', $input));
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function apply(string $userId, string $role, array $input): array
    {
        return AppointmentCreateInputPolicy::apply($this->db, ['user_id' => $userId, 'role' => $role], $input);
    }

    /** @param array<string, mixed> $input */
    private function assertDenied(int $status, string $code, string $userId, string $role, array $input): void
    {
        try {
            $this->apply($userId, $role, $input);
        } catch (AppointmentCreateInputDenied $e) {
            $this->assertSame($status, $e->httpStatus);
            $this->assertSame($code, $e->errorCode);
            return;
        }
        $this->fail("Refus $code attendu");
    }

    private function profile(string $role, ?string $labId = null): string
    {
        $id = TestFixtures::insertProfile($this->db, $role, $labId);
        $this->profileIds[] = $id;

        return $id;
    }

    private function patientCreatedBy(string $creatorId): string
    {
        $id = $this->profile('patient');
        $this->db->prepare('UPDATE profiles SET created_by = ? WHERE id = ?')->execute([$creatorId, $id]);

        return $id;
    }

    private function sourceAppointment(string $patientId, string $proId, string $status, string $type = 'blood_test'): string
    {
        $id = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $isBlood = $type === 'blood_test';
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, location_lat, location_lng,
                address_encrypted, address_dek, scheduled_at, patient_id, assigned_lab_id, assigned_to
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, NOW(), ?, ?, ?)'
        )->execute([
            $id, $type, $status, $proId, 'pro', $type, 'fixture-addr', 'fixture-dek',
            $patientId, $isBlood ? TestFixtures::LAB : null, $isBlood ? TestFixtures::PRELEVEUR : null,
        ]);
        $this->appointmentIds[] = $id;

        return $id;
    }
}
