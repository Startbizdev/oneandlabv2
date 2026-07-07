<?php

/**
 * Snooze de la modal d'offre RDV (évite le spam au polling sans retirer l'offre).
 */
class AppointmentOfferSnooze
{
    private const DEFAULT_MINUTES = 30;
    private const MAX_MINUTES = 240;

    public static function tableHasSnoozeColumn(PDO $db): bool
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }
        $stmt = $db->query("SHOW COLUMNS FROM appointment_offers LIKE 'modal_snoozed_until'");
        $cached = $stmt && $stmt->rowCount() > 0;
        return $cached;
    }

    /**
     * @return array{modal_snoozed_until: string, modal_ack_at: string}
     */
    public static function snoozeOffer(
        PDO $db,
        string $appointmentId,
        string $profileId,
        ?int $minutes = null
    ): array {
        if (!self::tableHasSnoozeColumn($db)) {
            throw new RuntimeException('Migration 097 requise (modal_snoozed_until).');
        }

        $mins = $minutes ?? self::DEFAULT_MINUTES;
        if ($mins < 1) {
            $mins = self::DEFAULT_MINUTES;
        }
        if ($mins > self::MAX_MINUTES) {
            $mins = self::MAX_MINUTES;
        }

        $check = $db->prepare(
            'SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1'
        );
        $check->execute([$appointmentId, $profileId]);
        if (!$check->fetch()) {
            throw new InvalidArgumentException('Ce rendez-vous ne vous est pas proposé ou n\'est plus disponible.');
        }

        $stmt = $db->prepare('
            UPDATE appointment_offers
            SET modal_snoozed_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
                modal_ack_at = NOW()
            WHERE appointment_id = ? AND profile_id = ?
        ');
        $stmt->execute([$mins, $appointmentId, $profileId]);

        $read = $db->prepare(
            'SELECT modal_snoozed_until, modal_ack_at FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1'
        );
        $read->execute([$appointmentId, $profileId]);
        $row = $read->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'modal_snoozed_until' => (string) ($row['modal_snoozed_until'] ?? ''),
            'modal_ack_at' => (string) ($row['modal_ack_at'] ?? ''),
        ];
    }

    /**
     * @param list<string> $appointmentIds
     */
    public static function enrichListWithSnooze(PDO $db, array &$appointments, string $profileId): void
    {
        if (!self::tableHasSnoozeColumn($db) || $appointments === []) {
            return;
        }

        $ids = [];
        foreach ($appointments as $apt) {
            $id = (string) ($apt['id'] ?? '');
            if ($id !== '') {
                $ids[] = $id;
            }
        }
        if ($ids === []) {
            return;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare(
            "SELECT appointment_id, modal_snoozed_until FROM appointment_offers
             WHERE profile_id = ? AND appointment_id IN ($placeholders)"
        );
        $stmt->execute(array_merge([$profileId], $ids));
        $byId = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $byId[(string) $row['appointment_id']] = $row['modal_snoozed_until'] ?? null;
        }

        foreach ($appointments as &$apt) {
            $id = (string) ($apt['id'] ?? '');
            $apt['offer_modal_snoozed_until'] = $byId[$id] ?? null;
        }
        unset($apt);
    }
}
