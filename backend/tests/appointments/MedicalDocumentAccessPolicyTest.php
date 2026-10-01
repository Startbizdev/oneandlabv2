<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/MedicalDocumentAccess.php';

final class MedicalDocumentAccessPolicyTest extends TestCase
{
    public function testNurseCreatorCanManageTargetAppointment(): void
    {
        $this->assertTrue(MedicalDocumentAccess::nurseCanManageAppointment(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null]
        ));
    }

    public function testAssignedNurseCanManageTargetAppointment(): void
    {
        $this->assertTrue(MedicalDocumentAccess::nurseCanManageAppointment(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'other', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testUnrelatedNurseCannotManageTargetAppointment(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanManageAppointment(
            ['user_id' => 'nurse-2', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testOtherRoleCannotUseNurseRule(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanManageAppointment(
            ['user_id' => 'pro-1', 'role' => 'pro'],
            ['created_by' => 'pro-1', 'assigned_nurse_id' => null]
        ));
    }

    public function testNurseCopyRequiresMatchingRelative(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanCopyDocumentToAppointment(
            $this->createMock(PDO::class),
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null],
            'patient-1',
            'relative-a',
            'patient-1',
            'relative-b'
        ));
    }

    public function testNurseCopyRejectsTitularDocumentOnRelativeAppointment(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanCopyDocumentToAppointment(
            $this->createMock(PDO::class),
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null],
            'patient-1',
            null,
            'patient-1',
            'relative-a'
        ));
    }

    public function testNurseCopyRejectsDifferentPatient(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanCopyDocumentToAppointment(
            $this->createMock(PDO::class),
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null],
            'patient-1',
            null,
            'patient-2',
            null
        ));
    }

    public function testUnrelatedNurseCannotCopyEvenWithMatchingSubject(): void
    {
        $this->assertFalse(MedicalDocumentAccess::nurseCanCopyDocumentToAppointment(
            $this->createMock(PDO::class),
            ['user_id' => 'nurse-2', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => 'nurse-1'],
            'patient-1',
            null,
            'patient-1',
            null
        ));
    }

    /** @param list<array<string, string>> $orders */
    private function dbReturningOrders(array $orders, array $expectedParams): PDO
    {
        $stmt = $this->createMock(PDOStatement::class);
        $stmt->expects($this->once())->method('execute')->with($expectedParams)->willReturn(true);
        $stmt->method('fetchAll')->willReturn($orders);
        $db = $this->createMock(PDO::class);
        $db->expects($this->once())->method('prepare')
            ->with($this->stringContains('FROM pharmacy_orders'))
            ->willReturn($stmt);

        return $db;
    }

    public function testRecipientPharmacyCanViewAttachedPrescription(): void
    {
        $db = $this->dbReturningOrders(
            [['requester_id' => 'pro-1', 'pharmacy_id' => 'ph-1', 'patient_id' => 'pat-1']],
            ['ph-1', 'ph-1', 'ph-1', 'doc-1'],
        );

        $this->assertTrue(MedicalDocumentAccess::userCanViewViaPharmacyOrder(
            $db,
            ['user_id' => 'ph-1', 'role' => 'pro'],
            'doc-1',
        ));
    }

    public function testUserWithoutLinkedOrderCannotViewPrescription(): void
    {
        $db = $this->dbReturningOrders([], ['ph-2', 'ph-2', 'ph-2', 'doc-1']);

        $this->assertFalse(MedicalDocumentAccess::userCanViewViaPharmacyOrder(
            $db,
            ['user_id' => 'ph-2', 'role' => 'pro'],
            'doc-1',
        ));
    }

    public function testPatientIdMatchRequiresPatientRole(): void
    {
        $db = $this->dbReturningOrders(
            [['requester_id' => 'pro-1', 'pharmacy_id' => 'ph-1', 'patient_id' => 'x-1']],
            ['x-1', 'x-1', 'x-1', 'doc-1'],
        );

        $this->assertFalse(MedicalDocumentAccess::userCanViewViaPharmacyOrder(
            $db,
            ['user_id' => 'x-1', 'role' => 'nurse'],
            'doc-1',
        ));
    }

    public function testEmptyDocumentIdNeverQueries(): void
    {
        $db = $this->createMock(PDO::class);
        $db->expects($this->never())->method('prepare');

        $this->assertFalse(MedicalDocumentAccess::userCanViewViaPharmacyOrder(
            $db,
            ['user_id' => 'ph-1', 'role' => 'pro'],
            '',
        ));
    }
}
