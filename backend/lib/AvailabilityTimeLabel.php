<?php

declare(strict_types=1);

/** Heures de créneau en français, minutes comprises : « 8h », « 7h45 », « 7h45 - 8h45 ». */
final class AvailabilityTimeLabel
{
    /** Heure décimale du créneau (7.75 = 7h45). */
    public static function hour(int|float|string $hour): string
    {
        return self::minutes((int) round(((float) $hour) * 60));
    }

    public static function minutes(int $minutes): string
    {
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;

        return $m === 0 ? $h . 'h' : $h . 'h' . str_pad((string) $m, 2, '0', STR_PAD_LEFT);
    }

    /** @param array{0: int|float|string, 1: int|float|string} $range */
    public static function range(array $range, string $separator = ' - '): string
    {
        return self::hour($range[0]) . $separator . self::hour($range[1]);
    }
}
