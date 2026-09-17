<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AppointmentConversation.php';

final class AppointmentConversationAclTest extends TestCase
{
    public function testPatientCanAccessOwnAppointment(): void
    {
        $this->assertTrue(AppointmentConversation::canAccess(
            ['user_id' => 'p1', 'role' => 'patient'],
            ['patient_id' => 'p1', 'created_by' => 'pro1', 'assigned_nurse_id' => null, 'assigned_lab_id' => null, 'assigned_to' => null, 'status' => 'confirmed']
        ));
    }

    public function testPatientCannotAccessOtherAppointment(): void
    {
        $this->assertFalse(AppointmentConversation::canAccess(
            ['user_id' => 'p1', 'role' => 'patient'],
            ['patient_id' => 'p2', 'created_by' => 'pro1', 'assigned_nurse_id' => null, 'assigned_lab_id' => null, 'assigned_to' => null, 'status' => 'confirmed']
        ));
    }

    public function testNurseAssignedCanAccess(): void
    {
        $this->assertTrue(AppointmentConversation::canAccess(
            ['user_id' => 'n1', 'role' => 'nurse'],
            ['patient_id' => 'p1', 'created_by' => 'pro1', 'assigned_nurse_id' => 'n1', 'assigned_lab_id' => null, 'assigned_to' => null, 'status' => 'confirmed']
        ));
    }

    public function testNurseCreatorCanAccessBloodTestAssignedToLab(): void
    {
        $this->assertTrue(AppointmentConversation::canAccess(
            ['user_id' => 'n1', 'role' => 'nurse'],
            [
                'patient_id' => 'p1',
                'created_by' => 'n1',
                'assigned_nurse_id' => null,
                'assigned_lab_id' => 'lab1',
                'assigned_to' => 'collector1',
                'status' => 'confirmed',
            ]
        ));
    }

    public function testUnrelatedNurseCannotAccess(): void
    {
        $this->assertFalse(AppointmentConversation::canAccess(
            ['user_id' => 'n2', 'role' => 'nurse'],
            [
                'patient_id' => 'p1',
                'created_by' => 'n1',
                'assigned_nurse_id' => null,
                'assigned_lab_id' => 'lab1',
                'assigned_to' => 'collector1',
                'status' => 'confirmed',
            ]
        ));
    }

    public function testCannotPostWhenCanceled(): void
    {
        $this->assertFalse(AppointmentConversation::canPost(
            ['user_id' => 'p1', 'role' => 'patient'],
            ['patient_id' => 'p1', 'created_by' => 'pro1', 'assigned_nurse_id' => null, 'assigned_lab_id' => null, 'assigned_to' => null, 'status' => 'canceled']
        ));
    }

    public function testNurseCreatorCannotPostWhenCanceled(): void
    {
        $this->assertFalse(AppointmentConversation::canPost(
            ['user_id' => 'n1', 'role' => 'nurse'],
            [
                'patient_id' => 'p1',
                'created_by' => 'n1',
                'assigned_nurse_id' => null,
                'assigned_lab_id' => 'lab1',
                'assigned_to' => 'collector1',
                'status' => 'canceled',
            ]
        ));
    }

    public function testNurseCreatorCanStillReadCanceledConversation(): void
    {
        $this->assertTrue(AppointmentConversation::canAccess(
            ['user_id' => 'n1', 'role' => 'nurse'],
            [
                'patient_id' => 'p1',
                'created_by' => 'n1',
                'assigned_nurse_id' => null,
                'assigned_lab_id' => 'lab1',
                'assigned_to' => 'collector1',
                'status' => 'canceled',
            ]
        ));
    }
}
