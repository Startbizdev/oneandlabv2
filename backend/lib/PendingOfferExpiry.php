<?php

require_once __DIR__ . '/AppTimezone.php';

/**
 * RDV pending non assignés : visibilité offres pros + expiration automatique.
 *
 * Journée (06:00–17:59 Paris) : expire created_at + N h (défaut 2).
 * Soir/nuit (18:00–05:59 Paris) : chrono à 06:00 → expire à 08:00 (6h + 2h).
 */
class PendingOfferExpiry
{
    public const OFF_HOURS_START = 18;
    public const OFF_HOURS_END = 6;
    public const MORNING_WINDOW_START = 6;

    public static function ttlHours(): int
    {
        $raw = $_ENV['PENDING_OFFER_EXPIRY_HOURS'] ?? getenv('PENDING_OFFER_EXPIRY_HOURS');
        $hours = is_string($raw) ? (int) trim($raw) : (int) $raw;
        if ($hours < 1) {
            $hours = 2;
        }

        return $hours;
    }

    public static function isOffHours(DateTimeInterface $instantParis): bool
    {
        $hour = (int) $instantParis->format('G');

        return $hour >= self::OFF_HOURS_START || $hour < self::OFF_HOURS_END;
    }

    public static function toParis(DateTimeInterface $instant): DateTimeImmutable
    {
        $dt = DateTimeImmutable::createFromInterface($instant);

        return $dt->setTimezone(new DateTimeZone(AppTimezone::TZ));
    }

    public static function computeExpiresAt(DateTimeInterface $createdAt): DateTimeImmutable
    {
        $paris = self::toParis($createdAt);
        $tz = new DateTimeZone(AppTimezone::TZ);

        if (!self::isOffHours($paris)) {
            return $paris->modify('+' . self::ttlHours() . ' hours');
        }

        $date = $paris->format('Y-m-d');
        $expireHour = self::MORNING_WINDOW_START + self::ttlHours();
        $morningExpire = new DateTimeImmutable(
            sprintf('%s %02d:00:00', $date, $expireHour),
            $tz
        );

        $hour = (int) $paris->format('G');
        if ($hour < self::OFF_HOURS_END) {
            return $morningExpire;
        }

        return $morningExpire->modify('+1 day');
    }

    public static function formatSqlDateTime(DateTimeInterface $instant): string
    {
        return self::toParis($instant)->format('Y-m-d H:i:s');
    }

    public static function shouldTrackOfferExpiry(
        string $status,
        string $type,
        ?string $assignedNurseId,
        ?string $assignedLabId
    ): bool {
        if ($status !== 'pending') {
            return false;
        }
        if ($type === 'nursing') {
            return trim((string) $assignedNurseId) === '';
        }
        if ($type === 'blood_test') {
            return trim((string) $assignedLabId) === '';
        }

        return false;
    }

    public static function computeExpiresAtForRow(array $row): ?DateTimeImmutable
    {
        $status = (string) ($row['status'] ?? '');
        $type = (string) ($row['type'] ?? '');
        if (!self::shouldTrackOfferExpiry(
            $status,
            $type,
            isset($row['assigned_nurse_id']) ? (string) $row['assigned_nurse_id'] : null,
            isset($row['assigned_lab_id']) ? (string) $row['assigned_lab_id'] : null
        )) {
            return null;
        }

        $createdRaw = (string) ($row['created_at'] ?? '');
        if ($createdRaw === '') {
            return self::computeExpiresAt(AppTimezone::now());
        }

        try {
            $created = new DateTimeImmutable($createdRaw, new DateTimeZone(AppTimezone::TZ));
        } catch (Exception) {
            $created = AppTimezone::now();
        }

        return self::computeExpiresAt($created);
    }

    /** Instant « maintenant » Paris pour comparaisons SQL (sans SET time_zone MySQL). */
    public static function sqlParisNowLiteral(): string
    {
        return "'" . AppTimezone::sqlDateTime() . "'";
    }

    /** SQL : RDV encore dans la fenêtre d'offre. */
    public static function sqlCreatedWithinTtl(string $appointmentAlias = 'a'): string
    {
        $now = self::sqlParisNowLiteral();

        return "({$appointmentAlias}.pending_offer_expires_at IS NOT NULL AND {$appointmentAlias}.pending_offer_expires_at > {$now})";
    }

    /** SQL : RDV à expirer (pending non assigné, fenêtre dépassée). */
    public static function sqlReadyToExpire(string $appointmentAlias = 'a'): string
    {
        $now = self::sqlParisNowLiteral();

        return "({$appointmentAlias}.pending_offer_expires_at IS NOT NULL AND {$appointmentAlias}.pending_offer_expires_at <= {$now})";
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
