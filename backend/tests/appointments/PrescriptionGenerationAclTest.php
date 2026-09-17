<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/PrescriptionGenerationPolicy.php';

final class PrescriptionGenerationAclTest extends TestCase
{
    public function testNurseWithPpaCanGenerateStandalone(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateStandalone(
            true,
            false,
            false,
            false
        ));
    }

    public function testNurseProfileCreatorCanGenerateStandalone(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateStandalone(
            false,
            true,
            false,
            false
        ));
    }

    public function testNurseVisibleInStaffListCanGenerateStandalone(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateStandalone(
            false,
            false,
            true,
            false
        ));
    }

    public function testNurseWithCreatedOrAssignedAppointmentCanGenerateStandalone(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateStandalone(
            false,
            false,
            false,
            true
        ));
    }

    public function testUnrelatedNurseCannotGenerateStandalone(): void
    {
        $this->assertFalse(PrescriptionGenerationPolicy::nurseCanGenerateStandalone(
            false,
            false,
            false,
            false
        ));
    }

    public function testNurseCreatorCanGenerateForAppointment(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateForAppointment(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null]
        ));
    }

    public function testAssignedNurseCanGenerateForAppointment(): void
    {
        $this->assertTrue(PrescriptionGenerationPolicy::nurseCanGenerateForAppointment(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'other', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testUnrelatedNurseCannotGenerateForAppointment(): void
    {
        $this->assertFalse(PrescriptionGenerationPolicy::nurseCanGenerateForAppointment(
            ['user_id' => 'nurse-2', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testProCannotUseNurseAppointmentRule(): void
    {
        $this->assertFalse(PrescriptionGenerationPolicy::nurseCanGenerateForAppointment(
            ['user_id' => 'pro-1', 'role' => 'pro'],
            ['created_by' => 'pro-1', 'assigned_nurse_id' => null]
        ));
    }
}
