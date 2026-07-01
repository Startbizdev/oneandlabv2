<?php

/** Comparaison de versions semver (ex. 1.4.0) pour l’app mobile. */
final class MobileAppVersion
{
    public static function compare(string $a, string $b): int
    {
        $left = self::parse($a);
        $right = self::parse($b);
        $len = max(count($left), count($right));

        for ($i = 0; $i < $len; $i++) {
            $l = $left[$i] ?? 0;
            $r = $right[$i] ?? 0;
            if ($l < $r) {
                return -1;
            }
            if ($l > $r) {
                return 1;
            }
        }

        return 0;
    }

    public static function isLower(string $current, string $minimum): bool
    {
        return self::compare($current, $minimum) < 0;
    }

    /** @return list<int> */
    private static function parse(string $value): array
    {
        $normalized = preg_replace('/^v/i', '', trim($value)) ?? '';
        $parts = preg_split('/[.-]/', $normalized) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $out[] = is_numeric($part) ? (int) $part : 0;
        }

        return $out;
    }
}
