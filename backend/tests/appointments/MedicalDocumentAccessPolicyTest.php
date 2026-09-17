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
}
