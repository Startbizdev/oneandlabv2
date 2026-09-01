<?php

/**
 * Zones de couverture carrées — miroir de packages/shared-utils/coverage-zone-geo.ts
 */
final class CoverageZoneGeo
{
    public const MIN_HALF_SIDE_KM = 5.0;
    public const MAX_HALF_SIDE_KM_LAB = 100.0;

    private const KM_PER_DEG_LAT = 111.32;

    private static function kmPerDegLng(float $lat): float
    {
        $cosLat = cos(deg2rad($lat));
        return self::KM_PER_DEG_LAT * max(0.01, abs($cosLat));
    }

    public static function clampHalfSideKm(float $km, float $maxKm, float $minKm = self::MIN_HALF_SIDE_KM): float
    {
        if (!is_finite($km)) {
            return $minKm;
        }
        return min($maxKm, max($minKm, $km));
    }

    /** @return array{min_lat: float, max_lat: float, min_lng: float, max_lng: float} */
    public static function halfSideKmToBounds(float $centerLat, float $centerLng, float $halfSideKm): array
    {
        $half = self::clampHalfSideKm($halfSideKm, self::MAX_HALF_SIDE_KM_LAB);
        $latDelta = $half / self::KM_PER_DEG_LAT;
        $lngDelta = $half / self::kmPerDegLng($centerLat);
        return [
            'min_lat' => $centerLat - $latDelta,
            'max_lat' => $centerLat + $latDelta,
            'min_lng' => $centerLng - $lngDelta,
            'max_lng' => $centerLng + $lngDelta,
        ];
    }

    public static function boundsToHalfSideKm(float $centerLat, float $centerLng, array $bounds): float
    {
        $latHalf = (($bounds['max_lat'] - $bounds['min_lat']) / 2) * self::KM_PER_DEG_LAT;
        $lngHalf = (($bounds['max_lng'] - $bounds['min_lng']) / 2) * self::kmPerDegLng($centerLat);
        $half = min($latHalf, $lngHalf);
        return (is_finite($half) && $half > 0) ? $half : self::MIN_HALF_SIDE_KM;
    }

    public static function isPointInBounds(float $lat, float $lng, array $bounds): bool
    {
        return $lat >= $bounds['min_lat']
            && $lat <= $bounds['max_lat']
            && $lng >= $bounds['min_lng']
            && $lng <= $bounds['max_lng'];
    }

    /** @param array<string, mixed>|null $raw */
    public static function normalizeBounds(?array $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        $minLat = isset($raw['min_lat']) ? (float) $raw['min_lat'] : NAN;
        $maxLat = isset($raw['max_lat']) ? (float) $raw['max_lat'] : NAN;
        $minLng = isset($raw['min_lng']) ? (float) $raw['min_lng'] : NAN;
        $maxLng = isset($raw['max_lng']) ? (float) $raw['max_lng'] : NAN;
        if (!is_finite($minLat) || !is_finite($maxLat) || !is_finite($minLng) || !is_finite($maxLng)) {
            return null;
        }
        if ($maxLat <= $minLat || $maxLng <= $minLng) {
            return null;
        }
        return [
            'min_lat' => $minLat,
            'max_lat' => $maxLat,
            'min_lng' => $minLng,
            'max_lng' => $maxLng,
        ];
    }

    public static function boundsAreSquareConsistent(
        float $centerLat,
        float $centerLng,
        array $bounds,
        float $toleranceRatio = 0.02
    ): bool {
        $half = self::boundsToHalfSideKm($centerLat, $centerLng, $bounds);
        $expected = self::halfSideKmToBounds($centerLat, $centerLng, $half);
        $tolLat = max(0.0001, ($expected['max_lat'] - $expected['min_lat']) * $toleranceRatio);
        $tolLng = max(0.0001, ($expected['max_lng'] - $expected['min_lng']) * $toleranceRatio);
        return abs($bounds['min_lat'] - $expected['min_lat']) <= $tolLat
            && abs($bounds['max_lat'] - $expected['max_lat']) <= $tolLat
            && abs($bounds['min_lng'] - $expected['min_lng']) <= $tolLng
            && abs($bounds['max_lng'] - $expected['max_lng']) <= $tolLng
            && $half >= self::MIN_HALF_SIDE_KM;
    }

    /**
     * @param array<string, mixed>|null $boundsJson
     * @return array{min_lat: float, max_lat: float, min_lng: float, max_lng: float}
     */
    public static function resolveZoneBounds(
        ?string $zoneType,
        float $centerLat,
        float $centerLng,
        float $radiusKm,
        ?array $boundsJson
    ): array {
        $bounds = self::normalizeBounds($boundsJson);
        if ($zoneType === 'square' && $bounds !== null) {
            return $bounds;
        }
        $half = (is_finite($radiusKm) && $radiusKm > 0) ? $radiusKm : self::MIN_HALF_SIDE_KM;
        return self::halfSideKmToBounds($centerLat, $centerLng, $half);
    }
}
