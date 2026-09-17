<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/BusinessNotificationPolicy.php';

final class BusinessNotificationPolicyTest extends TestCase
{
    private array $appointment = [
        'patient_id' => 'patient-1',
        'assigned_nurse_id' => 'nurse-1',
        'assigned_lab_id' => 'lab-1',
        'assigned_to' => 'collector-1',
        'assigned_pro_id' => 'pro-1',
        'created_by' => 'pro-1',
        'created_by_role' => 'pro',
    ];

    public function testPatientReplyNotifiesCreatorAndProfessionalsOnceButNeverAuthor(): void
    {
        $this->assertSame(
            ['nurse-1', 'lab-1', 'collector-1', 'pro-1'],
            BusinessNotificationPolicy::conversationRecipientIds($this->appointment, 'patient-1')
        );
    }

    public function testBusinessUpdateRecipientsAreDeduplicatedAndExcludeActor(): void
    {
        $appointment = $this->appointment;
        $appointment['assigned_lab_id'] = 'nurse-1';
        $appointment['created_by'] = 'nurse-1';

        $this->assertSame(
            ['patient-1', 'collector-1', 'pro-1'],
            BusinessNotificationPolicy::appointmentCounterpartIds($appointment, 'nurse-1')
        );
    }

    public function testPatientCreatorRoleIsNotAddedAsProfessionalCounterpart(): void
    {
        $appointment = $this->appointment;
        $appointment['created_by'] = 'other-patient';
        $appointment['created_by_role'] = 'patient';

        $this->assertNotContains(
            'other-patient',
            BusinessNotificationPolicy::appointmentCounterpartIds($appointment, 'admin-1')
        );
    }

    public function testUnchangedBusinessValuesDoNotTriggerNotification(): void
    {
        $before = [
            'scheduled_at' => '2026-09-20 09:00:00',
            'form_data' => ['availability' => ['type' => 'custom', 'range' => [9, 12]], 'notes' => 'avant'],
            'address' => ['label' => '1 rue Cary', 'lat' => 48.85660001, 'lng' => 2.3522],
        ];
        $after = [
            'scheduled_at' => '2026-09-20 09:00:00',
            'form_data' => ['availability' => ['range' => [9, 12], 'type' => 'custom'], 'notes' => 'après'],
            'address' => ['label' => '  1  rue Cary ', 'lat' => 48.8566, 'lng' => 2.35220001],
        ];

        $this->assertSame([], BusinessNotificationPolicy::changedBusinessFields($before, $after));
    }

    public function testScheduleAndAddressRealChangesAreReportedOnceEach(): void
    {
        $before = [
            'scheduled_at' => '2026-09-20 09:00:00',
            'form_data' => ['availability' => ['type' => 'custom', 'range' => [9, 12]]],
            'address' => ['label' => '1 rue Cary', 'lat' => 48.8566, 'lng' => 2.3522],
        ];
        $after = [
            'scheduled_at' => '2026-09-21 09:00:00',
            'form_data' => ['availability' => ['type' => 'custom', 'range' => [14, 18]]],
            'address' => ['label' => '2 rue Cary', 'lat' => 48.8566, 'lng' => 2.3522],
        ];

        $this->assertSame(
            ['schedule', 'address'],
            BusinessNotificationPolicy::changedBusinessFields($before, $after)
        );
    }
}
