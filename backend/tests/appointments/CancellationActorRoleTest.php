<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/appointments/bootstrap.php';

/**
 * Annulation par un pro (dont l'annulation de l'ancien RDV lors d'une reprogrammation) : traitée comme
 * une annulation professionnelle, qui prévient le labo / préleveur / infirmier assignés,
 * et non plus comme « Annulé par le patient ».
 */
final class CancellationActorRoleTest extends TestCase
{
    /** @return iterable<string, array{?string, string}> */
    public static function roleProvider(): iterable
    {
        yield 'pro' => ['pro', 'nurse'];
        yield 'infirmier' => ['nurse', 'nurse'];
        yield 'labo' => ['lab', 'nurse'];
        yield 'sous-compte' => ['subaccount', 'nurse'];
        yield 'préleveur' => ['preleveur', 'nurse'];
        yield 'admin' => ['super_admin', 'nurse'];
        yield 'patient' => ['patient', 'patient'];
        yield 'inconnu' => [null, 'patient'];
    }

    /** @dataProvider roleProvider */
    public function testCanceledByFollowsActorRole(?string $role, string $expected): void
    {
        $this->assertSame($expected, AppointmentNotificationService::canceledByForActorRole($role));
    }

    public function testProCancellationNotifiesAssignedLabAndPreleveur(): void
    {
        $previousAdminEmail = $_ENV['ADMIN_NOTIFY_EMAIL'] ?? null;
        $_ENV['ADMIN_NOTIFY_EMAIL'] = 'admin-alerts@test.invalid';
        try {
            $this->assertProCancellationNotifiesAssignees();
        } finally {
            if ($previousAdminEmail === null) {
                unset($_ENV['ADMIN_NOTIFY_EMAIL']);
            } else {
                $_ENV['ADMIN_NOTIFY_EMAIL'] = $previousAdminEmail;
            }
        }
    }

    private function assertProCancellationNotifiesAssignees(): void
    {
        $sent = [];
        $createNotification = static function (string $userId, string $type) use (&$sent): string {
            $sent[] = [$userId, $type];

            return 'n';
        };
        $db = new PDO('sqlite::memory:');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec('CREATE TABLE profiles (id TEXT, role TEXT)');
        $flow = new NotificationAppointmentCanceledFlow(
            $createNotification,
            new NotificationRecipientNotifier($db, $createNotification)
        );

        $flow->dispatch('apt-1', [
            'patient_id' => 'patient-1',
            'patient_first_name' => 'Alice',
            'patient_last_name' => 'Patiente',
            'type' => 'blood_test',
            'assigned_lab_id' => 'lab-1',
            'assigned_to' => 'preleveur-1',
            'cancellation_reason' => 'reschedule',
        ], AppointmentNotificationService::canceledByForActorRole('pro'), 'Le professionnel de santé Pierre Medecin', 'pro-1');

        $this->assertSame([
            ['patient-1', 'appointment_canceled'],
            ['lab-1', 'appointment_canceled_by_pro'],
            ['preleveur-1', 'appointment_canceled_by_pro'],
        ], $sent);
    }
}
