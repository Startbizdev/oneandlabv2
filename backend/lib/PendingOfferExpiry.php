<?php

/**
 * RDV pending non assignés : visibilité offres pros + expiration automatique.
 * Règle produit : expire après N heures depuis la création (created_at).
 */
class PendingOfferExpiry
{
    public static function ttlHours(): int
    {
        $raw = $_ENV['PENDING_OFFER_EXPIRY_HOURS'] ?? getenv('PENDING_OFFER_EXPIRY_HOURS');
        $hours = is_string($raw) ? (int) trim($raw) : (int) $raw;
        if ($hours < 1) {
            $hours = 2;
        }
        return $hours;
    }

    /** SQL : RDV encore dans la fenêtre d’offre (strictement après created_at + TTL). */
    public static function sqlCreatedWithinTtl(string $appointmentAlias = 'a'): string
    {
        $hours = self::ttlHours();
        return "{$appointmentAlias}.created_at > DATE_SUB(NOW(), INTERVAL {$hours} HOUR)";
    }

    /** SQL : RDV à expirer (pending non assigné, créé depuis plus de TTL heures). */
    public static function sqlReadyToExpire(string $appointmentAlias = 'a'): string
    {
        $hours = self::ttlHours();
        return "{$appointmentAlias}.created_at <= DATE_SUB(NOW(), INTERVAL {$hours} HOUR)";
    }

    public static function isUnassignedPendingRow(array $row): bool
    {
        $type = (string) ($row['type'] ?? '');
        if ($type === 'nursing') {
            $nurse = isset($row['assigned_nurse_id']) ? trim((string) $row['assigned_nurse_id']) : '';
            return $nurse === '';
        }
        if ($type === 'blood_test') {
            $lab = isset($row['assigned_lab_id']) ? trim((string) $row['assigned_lab_id']) : '';
            return $lab === '';
        }
        return false;
    }
}
