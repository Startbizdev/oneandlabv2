<?php

declare(strict_types=1);

/** Résolution créneaux passage → datetime Europe/Paris. */
final class PassageSlotResolver
{
    /** @var array<string, array{0: int, 1: int}> */
    private const SLOT_HOURS = [
        'morning' => [8, 0],
        'noon' => [12, 0],
        'afternoon' => [15, 0],
        'evening' => [18, 0],
        'night' => [21, 0],
    ];

    /**
     * Heure exacte « HH:MM » (accepte « HH:MM:SS » renvoyé par une colonne TIME).
     * Retourne null si vide ; lève une exception si le format est invalide.
     */
    public static function normalizeTime(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $value = trim((string) $raw);
        if ($value === '') {
            return null;
        }
        if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/D', $value, $m)) {
            throw new InvalidArgumentException('Heure invalide (format HH:MM attendu)');
        }

        return $m[1] . ':' . $m[2];
    }

    /** Clé stable d'un créneau quotidien : « morning », « custom@12:30 », « morning@07:45 ». */
    public static function slotKey(string $timeSlot, ?string $customTime): string
    {
        if ($timeSlot === 'all_day' || $customTime === null || $customTime === '') {
            return $timeSlot;
        }

        return $timeSlot . '@' . substr($customTime, 0, 5);
    }

    public static function scheduledAt(string $dateYmd, string $timeSlot, ?string $customTime): string
    {
        $tz = new DateTimeZone('Europe/Paris');
        $dateYmd = self::normalizeDate($dateYmd);

        if ($timeSlot !== 'all_day' && $customTime !== null && $customTime !== '') {
            $parts = explode(':', trim($customTime));
            $h = (int) ($parts[0] ?? 9);
            $m = (int) ($parts[1] ?? 0);
        } elseif ($timeSlot === 'all_day') {
            [$h, $m] = self::SLOT_HOURS['morning'];
        } else {
            $slot = self::SLOT_HOURS[$timeSlot] ?? self::SLOT_HOURS['morning'];
            [$h, $m] = $slot;
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', sprintf('%s %02d:%02d:00', $dateYmd, $h, $m), $tz);
        if (!$dt) {
            throw new InvalidArgumentException('Date ou créneau invalide');
        }

        return $dt->format('Y-m-d H:i:s');
    }

    /**
     * Heure effective pour un passage infirmier : si le créneau du jour est déjà passé,
     * on planifie dans quelques minutes pour ne pas bloquer la tournée du jour.
     * Retourne null si la date calendaire est strictement antérieure à aujourd'hui (Paris).
     */
    public static function effectiveScheduledAtForNursePassage(
        string $dateYmd,
        string $timeSlot,
        ?string $customTime,
        ?DateTimeImmutable $now = null,
    ): ?string {
        $scheduledAt = self::scheduledAt($dateYmd, $timeSlot, $customTime);
        $tz = new DateTimeZone('Europe/Paris');
        $scheduled = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $scheduledAt, $tz);
        if (!$scheduled) {
            throw new InvalidArgumentException('Date ou créneau invalide');
        }
        $now = $now ?? new DateTimeImmutable('now', $tz);

        if ($scheduled >= $now) {
            return $scheduledAt;
        }

        if ($scheduled->format('Y-m-d') === $now->format('Y-m-d')) {
            return $now->modify('+5 minutes')->format('Y-m-d H:i:s');
        }

        return null;
    }

    /** @param array{0: int|float, 1: int|float}|null $timeRange */
    public static function availabilityJson(string $timeSlot, ?string $customTime, ?array $timeRange = null): string
    {
        if ($timeRange !== null && count($timeRange) >= 2) {
            return json_encode(
                ['type' => 'custom', 'range' => [self::quarterHour($timeRange[0]), self::quarterHour($timeRange[1])]],
                JSON_THROW_ON_ERROR,
            );
        }

        if ($timeSlot === 'all_day') {
            return json_encode(['type' => 'all_day'], JSON_THROW_ON_ERROR);
        }

        if ($customTime !== null && $customTime !== '') {
            $parts = explode(':', trim($customTime));
            $start = self::quarterHour((int) ($parts[0] ?? 9) + ((int) ($parts[1] ?? 0)) / 60);
            return json_encode(
                ['type' => 'custom', 'range' => [$start, self::quarterHour(min(24, $start + 1))]],
                JSON_THROW_ON_ERROR,
            );
        }

        $labels = [
            'morning' => [8, 12],
            'noon' => [12, 14],
            'afternoon' => [14, 18],
            'evening' => [18, 21],
            'night' => [21, 23],
        ];
        $range = $labels[$timeSlot] ?? [8, 12];

        return json_encode(['type' => 'custom', 'range' => $range], JSON_THROW_ON_ERROR);
    }

    /** Heure décimale arrondie au quart d'heure (8.25 = 8 h 15). */
    public static function quarterHour(int|float|string $hour): int|float
    {
        $rounded = round(((float) $hour) * 4) / 4;
        $rounded = max(0.0, min(24.0, $rounded));

        return floor($rounded) === $rounded ? (int) $rounded : $rounded;
    }

    private static function normalizeDate(string $date): string
    {
        $dt = DateTimeImmutable::createFromFormat('Y-m-d', $date, new DateTimeZone('Europe/Paris'));
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            throw new InvalidArgumentException('Date invalide (YYYY-MM-DD)');
        }

        return $date;
    }
}
