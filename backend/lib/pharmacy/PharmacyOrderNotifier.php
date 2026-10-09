<?php

declare(strict_types=1);

/**
 * Notifications (in-app + push) d'une commande pharmacie vers l'autre partie.
 * `pharmacy_order_side` indique au client la vue à ouvrir : officine (`received`) ou demandeur (`sent`).
 */
final class PharmacyOrderNotifier
{
    public const SIDE_RECEIVED = 'received';
    public const SIDE_SENT = 'sent';

    public function __construct(
        /** @var callable(string, string, string, string, ?array): mixed */
        private $createNotification,
    ) {
    }

    /**
     * Pharmacie qui annule → demandeur et patient ; demandeur ou patient qui annule → pharmacie ;
     * administrateur → toutes les parties.
     *
     * @param array<string, mixed> $order
     * @return list<string>
     */
    public static function cancellationRecipients(array $order, string $actorId): array
    {
        $pharmacyId = (string) ($order['pharmacy_id'] ?? '');
        $requesterId = (string) ($order['requester_id'] ?? '');
        $patientId = (string) ($order['patient_id'] ?? '');

        if ($actorId === $pharmacyId) {
            $candidates = [$requesterId, $patientId];
        } elseif ($actorId === $requesterId || $actorId === $patientId) {
            $candidates = [$pharmacyId];
        } else {
            $candidates = [$requesterId, $patientId, $pharmacyId];
        }

        return array_values(array_unique(array_filter(
            $candidates,
            static fn (string $id) => $id !== '' && $id !== $actorId,
        )));
    }

    /**
     * @param array<string, mixed> $order
     * @return list<string> Destinataires notifiés
     */
    public function orderCancelled(array $order, string $actorId): array
    {
        $pharmacyId = (string) ($order['pharmacy_id'] ?? '');
        $message = match ($actorId) {
            $pharmacyId => 'La pharmacie a annulé votre commande.',
            (string) ($order['patient_id'] ?? '') => 'Le patient a annulé la commande.',
            (string) ($order['requester_id'] ?? '') => 'Le demandeur a annulé la commande.',
            default => 'La commande a été annulée.',
        };

        $recipients = self::cancellationRecipients($order, $actorId);
        foreach ($recipients as $recipientId) {
            $this->send(
                $recipientId,
                'pharmacy_order_cancelled',
                'Commande annulée',
                $message,
                $order,
                $recipientId === $pharmacyId ? self::SIDE_RECEIVED : self::SIDE_SENT,
            );
        }

        return $recipients;
    }

    /**
     * @param array<string, mixed> $order
     * @param bool $complementAnswered La commande attendait un complément et repasse en attente.
     */
    public function prescriptionsAdded(array $order, bool $complementAnswered = false): void
    {
        $this->send(
            (string) ($order['pharmacy_id'] ?? ''),
            'pharmacy_order_prescriptions_added',
            $complementAnswered ? 'Complément reçu' : 'Ordonnance ajoutée',
            $complementAnswered
                ? 'Le complément demandé a été envoyé : la commande vous attend à nouveau.'
                : 'Une ordonnance a été ajoutée à la commande.',
            $order,
            self::SIDE_RECEIVED,
        );
    }

    /** @param array<string, mixed> $order */
    private function send(
        string $recipientId,
        string $type,
        string $title,
        string $message,
        array $order,
        string $side,
    ): void {
        if ($recipientId === '') {
            return;
        }
        $orderId = (string) ($order['id'] ?? '');
        try {
            ($this->createNotification)(
                $recipientId,
                $type,
                $title,
                $message,
                ['pharmacy_order_id' => $orderId, 'pharmacy_order_side' => $side],
            );
        } catch (Throwable $e) {
            error_log("PharmacyOrderNotifier $type commande $orderId → $recipientId : " . $e->getMessage());
        }
    }
}
