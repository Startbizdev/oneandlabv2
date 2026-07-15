<?php

declare(strict_types=1);

/** Expansion des dates de planification passage (sans DB). */
final class PassageDateExpander
{
    public const MAX_DAYS_WITHOUT_END = 90;

    public const OPEN_ENDED_HORIZON_DAYS = 365;

    /**
     * @param array<string, mixed> $config
     * @return list<string> Dates Y-m-d triées uniques
     */
    public static function expand(string $planningType, array $config): array
    {
        return match ($planningType) {
            'single_day', 'manual' => self::singleDay($config),
            'interval' => self::interval($config),
            'weekdays' => self::weekdays($config),
            'custom_dates' => self::customDates($config),
            default => throw new InvalidArgumentException('planning_type invalide'),
        };
    }

    /** @param array<string, mixed> $config */
    private static function singleDay(array $config): array
    {
        $start = self::requireStartDate($config);
        $endRaw = trim((string) ($config['end_date'] ?? ''));
        if ($endRaw === '') {
            return [$start];
        }
        $end = self::validateEndDate($endRaw);
        if ($end < $start) {
            throw new InvalidArgumentException('end_date doit être >= start_date');
        }

        $dates = [];
        $cursor = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));
        $limit = new DateTimeImmutable($end, new DateTimeZone('Europe/Paris'));
        while ($cursor <= $limit) {
            $dates[] = $cursor->format('Y-m-d');
            $cursor = $cursor->modify('+1 day');
        }

        return $dates;
    }

    /** @param array<string, mixed> $config */
    private static function interval(array $config): array
    {
        $start = self::requireStartDate($config);
        $every = max(1, (int) ($config['every_days'] ?? 3));
        $end = self::resolveEndDate($config, $start);
        $dates = [];
        $cursor = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));
        $limit = new DateTimeImmutable($end, new DateTimeZone('Europe/Paris'));
        while ($cursor <= $limit) {
            $dates[] = $cursor->format('Y-m-d');
            $cursor = $cursor->modify('+' . $every . ' days');
        }

        return $dates;
    }

    /** @param array<string, mixed> $config */
    private static function weekdays(array $config): array
    {
        $start = self::requireStartDate($config);
        $end = self::resolveEndDate($config, $start);
        $weekdays = $config['weekdays'] ?? [];
        if (!is_array($weekdays) || $weekdays === []) {
            throw new InvalidArgumentException('weekdays requis');
        }
        $allowed = [];
        foreach ($weekdays as $d) {
            $n = (int) $d;
            if ($n >= 1 && $n <= 7) {
                $allowed[$n] = true;
            }
        }
        if ($allowed === []) {
            throw new InvalidArgumentException('weekdays invalides');
        }

        $dates = [];
        $cursor = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));
        $limit = new DateTimeImmutable($end, new DateTimeZone('Europe/Paris'));
        while ($cursor <= $limit) {
            $iso = (int) $cursor->format('N');
            if (isset($allowed[$iso])) {
                $dates[] = $cursor->format('Y-m-d');
            }
            $cursor = $cursor->modify('+1 day');
        }

        return $dates;
    }

    /** @param array<string, mixed> $config */
    private static function customDates(array $config): array
    {
        $raw = $config['dates'] ?? [];
        if (!is_array($raw) || $raw === []) {
            throw new InvalidArgumentException('dates requises');
        }
        $dates = [];
        foreach ($raw as $d) {
            $d = trim((string) $d);
            if ($d === '') {
                continue;
            }
            $dt = DateTimeImmutable::createFromFormat('Y-m-d', $d, new DateTimeZone('Europe/Paris'));
            if (!$dt || $dt->format('Y-m-d') !== $d) {
                throw new InvalidArgumentException('date invalide: ' . $d);
            }
            $dates[$d] = true;
        }
        if ($dates === []) {
            throw new InvalidArgumentException('dates invalides');
        }
        $sorted = array_keys($dates);
        sort($sorted);

        return $sorted;
    }

    /** @param array<string, mixed> $config */
    private static function requireStartDate(array $config): string
    {
        $start = trim((string) ($config['start_date'] ?? ''));
        if ($start === '') {
            throw new InvalidArgumentException('start_date requis');
        }
        $dt = DateTimeImmutable::createFromFormat('Y-m-d', $start, new DateTimeZone('Europe/Paris'));
        if (!$dt || $dt->format('Y-m-d') !== $start) {
            throw new InvalidArgumentException('start_date invalide');
        }

        return $start;
    }

    /** @param array<string, mixed> $config */
    private static function resolveEndDate(array $config, string $start): string
    {
        $endRaw = trim((string) ($config['end_date'] ?? ''));
        if ($endRaw !== '') {
            return self::validateEndDate($endRaw);
        }

        $openEnded = !empty($config['open_ended']);
        $horizonDays = $openEnded ? self::OPEN_ENDED_HORIZON_DAYS : self::MAX_DAYS_WITHOUT_END;
        $startDt = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));

        return $startDt->modify('+' . ($horizonDays - 1) . ' days')->format('Y-m-d');
    }

    private static function validateEndDate(string $endRaw): string
    {
        $dt = DateTimeImmutable::createFromFormat('Y-m-d', $endRaw, new DateTimeZone('Europe/Paris'));
        if (!$dt || $dt->format('Y-m-d') !== $endRaw) {
            throw new InvalidArgumentException('end_date invalide');
        }

        return $endRaw;
    }
}
