<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AppointmentCancellationPolicy.php';

final class AppointmentCancellationPolicyTest extends TestCase
{
    public function testNurseCreatorCanCancel(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => null]
        ));
    }

    public function testAssignedNurseCannotCancelAppointmentSentByPlatformOrPro(): void
    {
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'patient-1', 'assigned_nurse_id' => 'nurse-1']
        ));
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'nurse-1', 'role' => 'nurse'],
            ['created_by' => 'pro-1', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testUnrelatedNurseCannotCancel(): void
    {
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'nurse-2', 'role' => 'nurse'],
            ['created_by' => 'nurse-1', 'assigned_nurse_id' => 'nurse-1']
        ));
    }

    public function testProCancelsOnlyOwnAppointments(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'pro-1', 'role' => 'pro'],
            ['created_by' => 'pro-1']
        ));
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'pro-1', 'role' => 'pro'],
            ['created_by' => 'nurse-1']
        ));
    }

    public function testPatientCancelsOnlyOwnAppointments(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'patient-1', 'role' => 'patient'],
            ['created_by' => 'patient-1']
        ));
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'patient-1', 'role' => 'patient'],
            ['created_by' => 'nurse-1']
        ));
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'patient-2', 'role' => 'patient'],
            ['created_by' => 'patient-1']
        ));
    }

    public function testLabKeepsCreatorOrAssignmentAndPreleveurKeepsAssignment(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'lab-1', 'role' => 'lab'],
            ['created_by' => 'nurse-1', 'assigned_lab_id' => 'lab-1']
        ));
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'prel-1', 'role' => 'preleveur'],
            ['created_by' => 'nurse-1', 'assigned_to' => 'prel-1']
        ));
        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'prel-1', 'role' => 'preleveur'],
            ['created_by' => 'prel-1']
        ));
    }

    public function testSuperAdminCanCancelAnyAppointment(): void
    {
        $this->assertTrue(AppointmentCancellationPolicy::canCancel(
            ['user_id' => 'admin-1', 'role' => 'super_admin'],
            []
        ));
    }
}
