<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AppointmentCancellationPolicy.php';

final class AppointmentCancellationPolicyTest extends TestCase
{
    public function testNurseCreatorCanCancel(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canStaffCancel(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null]
        ));
    }

    public function testAssignedNurseCanCancel(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canStaffCancel(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'other', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testUnrelatedNurseCannotCancel(): void
    {
        $this->assertFalse(AppointmentCancellationPolicy::canStaffCancel(
            ['user_id' => 'nurse-2', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testSuperAdminCanCancelAnyAppointment(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canStaffCancel(
            ['user_id' => 'admin-1', 'role' => 'super_admin'],
            []
        ));
    }

    public function testNurseCannotCancelWithoutReasonContextWhenUnrelated(): void
    {
        $this->assertFalse(AppointmentCancellationPolicy::canStaffCancel(
            ['user_id' => 'nurse-3', 'role' => 'nurse'],
            ['created_by' => 'pro-1', 'assigned_nurse_id' => null, 'assigned_lab_id' => 'lab-1']
        ));
    }
}
