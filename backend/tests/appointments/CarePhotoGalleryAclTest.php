<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/CarePhotoGallery.php';

final class CarePhotoGalleryAclTest extends TestCase
{
    private function eligibleAppointment(): array
    {
        return [
            'id' => 'a1',
            'type' => 'nursing',
            'status' => 'confirmed',
            'patient_id' => 'p1',
            'created_by' => 'pro1',
            'created_by_role' => 'pro',
            'assigned_nurse_id' => 'n1',
        ];
    }

    public function testPatientCannotViewCareFollowUpEvenForOwnAppointment(): void
    {
        $appointment = $this->eligibleAppointment();
        $this->assertFalse(CarePhotoGallery::canView(
            ['user_id' => 'p1', 'role' => 'patient'],
            $appointment
        ));
        $this->assertFalse(CarePhotoGallery::canView(
            ['user_id' => 'n1', 'role' => 'patient'],
            $appointment
        ));
        $this->assertFalse(CarePhotoGallery::canUpload(
            ['user_id' => 'p1', 'role' => 'patient'],
            $appointment
        ));
        $this->assertFalse(CarePhotoGallery::canComment(
            ['user_id' => 'p1', 'role' => 'patient'],
            $appointment
        ));
    }

    public function testOnlyAssignedNurseCanUseCareFollowUp(): void
    {
        $appointment = $this->eligibleAppointment();
        $assigned = ['user_id' => 'n1', 'role' => 'nurse'];
        $other = ['user_id' => 'n2', 'role' => 'nurse'];

        $this->assertTrue(CarePhotoGallery::canView($assigned, $appointment));
        $this->assertTrue(CarePhotoGallery::canUpload($assigned, $appointment));
        $this->assertTrue(CarePhotoGallery::canComment($assigned, $appointment));
        $this->assertFalse(CarePhotoGallery::canView($other, $appointment));
        $this->assertFalse(CarePhotoGallery::canUpload($other, $appointment));
        $this->assertFalse(CarePhotoGallery::canComment($other, $appointment));
    }
}
