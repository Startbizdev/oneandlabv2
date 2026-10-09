<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderNotifier.php';

final class PharmacyOrderNotifierTest extends TestCase
{
    private const ORDER = [
        'id' => 'order-1',
        'requester_id' => 'nurse-1',
        'patient_id' => 'patient-1',
        'pharmacy_id' => 'pharmacy-1',
    ];

    /** @var list<array{0: string, 1: string, 2: string, 3: string, 4: ?array}> */
    private array $sent = [];

    private function notifier(): PharmacyOrderNotifier
    {
        $this->sent = [];

        return new PharmacyOrderNotifier(function (string $userId, string $type, string $title, string $message, ?array $data): string {
            $this->sent[] = [$userId, $type, $title, $message, $data];

            return 'notif-' . count($this->sent);
        });
    }

    public function testPharmacyCancellationNotifiesRequesterAndPatient(): void
    {
        $recipients = $this->notifier()->orderCancelled(self::ORDER, 'pharmacy-1');

        $this->assertSame(['nurse-1', 'patient-1'], $recipients);
        $this->assertSame(['nurse-1', 'patient-1'], array_column($this->sent, 0));
        foreach ($this->sent as [, $type, , $message, $data]) {
            $this->assertSame('pharmacy_order_cancelled', $type);
            $this->assertSame('La pharmacie a annulé votre commande.', $message);
            $this->assertSame(['pharmacy_order_id' => 'order-1', 'pharmacy_order_side' => 'sent'], $data);
        }
    }

    public function testRequesterCancellationNotifiesPharmacyOnly(): void
    {
        $recipients = $this->notifier()->orderCancelled(self::ORDER, 'nurse-1');

        $this->assertSame(['pharmacy-1'], $recipients);
        $this->assertCount(1, $this->sent);
        $this->assertSame('Le demandeur a annulé la commande.', $this->sent[0][3]);
        $this->assertSame(['pharmacy_order_id' => 'order-1', 'pharmacy_order_side' => 'received'], $this->sent[0][4]);
    }

    public function testPatientCancellationNotifiesPharmacyOnly(): void
    {
        $recipients = $this->notifier()->orderCancelled(self::ORDER, 'patient-1');

        $this->assertSame(['pharmacy-1'], $recipients);
        $this->assertSame('Le patient a annulé la commande.', $this->sent[0][3]);
    }

    public function testPatientWhoIsRequesterIsNotNotifiedTwice(): void
    {
        $order = ['requester_id' => 'patient-1'] + self::ORDER;

        $this->assertSame(['patient-1'], PharmacyOrderNotifier::cancellationRecipients($order, 'pharmacy-1'));
    }

    public function testAdminCancellationNotifiesEveryParty(): void
    {
        $this->assertSame(
            ['nurse-1', 'patient-1', 'pharmacy-1'],
            PharmacyOrderNotifier::cancellationRecipients(self::ORDER, 'admin-1'),
        );
    }

    public function testPrescriptionsAddedNotifiesPharmacy(): void
    {
        $this->notifier()->prescriptionsAdded(self::ORDER);

        $this->assertCount(1, $this->sent);
        $this->assertSame('pharmacy-1', $this->sent[0][0]);
        $this->assertSame('pharmacy_order_prescriptions_added', $this->sent[0][1]);
        $this->assertSame('Ordonnance ajoutée', $this->sent[0][2]);
        $this->assertSame(['pharmacy_order_id' => 'order-1', 'pharmacy_order_side' => 'received'], $this->sent[0][4]);
    }

    public function testAnsweredComplementTellsThePharmacyTheOrderIsBack(): void
    {
        $this->notifier()->prescriptionsAdded(self::ORDER, true);

        $this->assertCount(1, $this->sent);
        $this->assertSame('pharmacy-1', $this->sent[0][0]);
        $this->assertSame('pharmacy_order_prescriptions_added', $this->sent[0][1]);
        $this->assertSame('Complément reçu', $this->sent[0][2]);
        $this->assertSame(['pharmacy_order_id' => 'order-1', 'pharmacy_order_side' => 'received'], $this->sent[0][4]);
    }

    public function testNotificationFailureDoesNotInterruptOtherRecipients(): void
    {
        $calls = [];
        $notifier = new PharmacyOrderNotifier(function (string $userId) use (&$calls): string {
            $calls[] = $userId;
            if ($userId === 'nurse-1') {
                throw new RuntimeException('push indisponible');
            }

            return 'ok';
        });

        $previousLog = ini_set('error_log', '/dev/null');
        try {
            $notifier->orderCancelled(self::ORDER, 'pharmacy-1');
        } finally {
            ini_set('error_log', $previousLog === false ? '' : $previousLog);
        }

        $this->assertSame(['nurse-1', 'patient-1'], $calls);
    }
}
