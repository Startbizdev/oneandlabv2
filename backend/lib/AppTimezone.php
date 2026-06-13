<?php

/**
 * Fuseau métier unique — Europe/Paris (cohérent notifications, RDV, ordonnances).
 */
class AppTimezone
{
    public const TZ = 'Europe/Paris';

    public static function now(): DateTimeImmutable
    {
        try {
            return new DateTimeImmutable('now', new DateTimeZone(self::TZ));
        } catch (Exception $e) {
            return new DateTimeImmutable('now');
        }
    }

    public static function format(string $pattern, ?DateTimeInterface $instant = null): string
    {
        $dt = $instant ?? self::now();
        if (!$dt instanceof DateTimeImmutable) {
            $dt = DateTimeImmutable::createFromInterface($dt);
        }

        return $dt->setTimezone(new DateTimeZone(self::TZ))->format($pattern);
    }

    public static function iso8601(?DateTimeInterface $instant = null): string
    {
        return self::format('Y-m-d\TH:i:sP', $instant);
    }

    public static function sqlDateTime(?DateTimeInterface $instant = null): string
    {
        return self::format('Y-m-d H:i:s', $instant);
    }

    public static function displayDate(?DateTimeInterface $instant = null): string
    {
        return self::format('d/m/Y', $instant);
    }

    public static function displayDateTime(?DateTimeInterface $instant = null): string
    {
        return self::format('d/m/Y \à H:i:s', $instant);
    }

    public static function tzAbbrev(?DateTimeInterface $instant = null): string
    {
        return self::format('T', $instant);
    }

    /** Date ordonnance au format Y-m-d (Europe/Paris). */
    public static function parseDateYmd(string $raw): ?DateTimeImmutable
    {
        $raw = trim($raw);
        if ($raw === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return null;
        }
        $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $raw, new DateTimeZone(self::TZ));
        if ($dt === false) {
            return null;
        }
        $errors = DateTimeImmutable::getLastErrors();
        if (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0) {
            return null;
        }

        return $dt;
    }
}
