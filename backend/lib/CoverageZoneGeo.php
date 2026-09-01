<?php

/**
 * Zones de couverture carrées — miroir de packages/shared-utils/coverage-zone-geo.ts
 */
final class CoverageZoneGeo
{
    public const MIN_HALF_SIDE_KM = 5.0;
    public const MAX_HALF_SIDE_KM_LAB = 100.0;
    public const COVERAGE_VERTEX_COUNT = 6;
    public const MIN_VERTEX_DISTANCE_KM = 0.2;

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
        $vertices = self::normalizeVertices($boundsJson);
        if ($vertices !== null && count($vertices) >= 3) {
            return self::verticesToBounds($vertices);
        }
        $bounds = self::normalizeBounds($boundsJson);
        if (($zoneType === 'square' || $zoneType === 'polygon') && $bounds !== null) {
            return $bounds;
        }
        $half = (is_finite($radiusKm) && $radiusKm > 0) ? $radiusKm : self::MIN_HALF_SIDE_KM;
        return self::halfSideKmToBounds($centerLat, $centerLng, $half);
    }

    /** @return array{lat: float, lng: float} */
    public static function offsetPointByKm(float $centerLat, float $centerLng, float $distanceKm, float $bearingDeg): array
    {
        $rad = deg2rad($bearingDeg);
        return [
            'lat' => $centerLat + ($distanceKm * cos($rad)) / self::KM_PER_DEG_LAT,
            'lng' => $centerLng + ($distanceKm * sin($rad)) / self::kmPerDegLng($centerLat),
        ];
    }

    public static function planarDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = ($lat2 - $lat1) * self::KM_PER_DEG_LAT;
        $dLng = ($lng2 - $lng1) * self::kmPerDegLng($lat1);
        return sqrt($dLat * $dLat + $dLng * $dLng);
    }

    public static function planarBearingDeg(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $dLat = ($toLat - $fromLat) * self::KM_PER_DEG_LAT;
        $dLng = ($toLng - $fromLng) * self::kmPerDegLng($fromLat);
        $deg = rad2deg(atan2($dLng, $dLat));
        return fmod($deg + 360.0, 360.0);
    }

    /**
     * Carré par défaut — 6 sommets : 4 angles + milieu Nord + milieu Sud.
     *
     * @return list<array{lat: float, lng: float}>
     */
    public static function defaultSquareVertices(float $centerLat, float $centerLng, float $halfSideKm): array
    {
        $half = max(self::MIN_VERTEX_DISTANCE_KM, $halfSideKm);
        $latD = $half / self::KM_PER_DEG_LAT;
        $lngD = $half / self::kmPerDegLng($centerLat);
        return [
            ['lat' => $centerLat + $latD, 'lng' => $centerLng - $lngD],
            ['lat' => $centerLat + $latD, 'lng' => $centerLng],
            ['lat' => $centerLat + $latD, 'lng' => $centerLng + $lngD],
            ['lat' => $centerLat - $latD, 'lng' => $centerLng + $lngD],
            ['lat' => $centerLat - $latD, 'lng' => $centerLng],
            ['lat' => $centerLat - $latD, 'lng' => $centerLng - $lngD],
        ];
    }

    /** @deprecated Préférer defaultSquareVertices */
    public static function defaultSquareSixVertices(float $centerLat, float $centerLng, float $halfSideKm): array
    {
        return self::defaultSquareVertices($centerLat, $centerLng, $halfSideKm);
    }

    /** @deprecated Préférer defaultSquareVertices */
    public static function regularHexagonVertices(float $centerLat, float $centerLng, float $halfSideKm): array
    {
        return self::defaultSquareVertices($centerLat, $centerLng, $halfSideKm);
    }

    /** @return array{lat: float, lng: float} */
    public static function clampVertexToMaxKm(
        float $centerLat,
        float $centerLng,
        float $lat,
        float $lng,
        float $maxKm,
        float $minKm = self::MIN_VERTEX_DISTANCE_KM
    ): array {
        $d = self::planarDistanceKm($centerLat, $centerLng, $lat, $lng);
        $bearing = $d <= 1e-9 ? 0.0 : self::planarBearingDeg($centerLat, $centerLng, $lat, $lng);
        if ($d < $minKm) {
            return self::offsetPointByKm($centerLat, $centerLng, $minKm, $bearing);
        }
        if ($d > $maxKm) {
            return self::offsetPointByKm($centerLat, $centerLng, $maxKm, $bearing);
        }
        return ['lat' => $lat, 'lng' => $lng];
    }

    /**
     * @param list<array{lat: float, lng: float}> $vertices
     * @return list<array{lat: float, lng: float}>
     */
    public static function clampVerticesToMaxKm(
        float $centerLat,
        float $centerLng,
        array $vertices,
        float $maxKm
    ): array {
        $out = [];
        foreach ($vertices as $v) {
            $out[] = self::clampVertexToMaxKm(
                $centerLat,
                $centerLng,
                (float) $v['lat'],
                (float) $v['lng'],
                $maxKm
            );
        }
        return $out;
    }

    /**
     * @param list<array{lat: float, lng: float}> $vertices
     * @return array{min_lat: float, max_lat: float, min_lng: float, max_lng: float}
     */
    public static function verticesToBounds(array $vertices): array
    {
        $lats = array_map(static fn ($v) => (float) $v['lat'], $vertices);
        $lngs = array_map(static fn ($v) => (float) $v['lng'], $vertices);
        return [
            'min_lat' => min($lats),
            'max_lat' => max($lats),
            'min_lng' => min($lngs),
            'max_lng' => max($lngs),
        ];
    }

    /** @param list<array{lat: float, lng: float}> $vertices */
    public static function maxVertexDistanceKm(float $centerLat, float $centerLng, array $vertices): float
    {
        $max = 0.0;
        foreach ($vertices as $v) {
            $d = self::planarDistanceKm($centerLat, $centerLng, (float) $v['lat'], (float) $v['lng']);
            if ($d > $max) {
                $max = $d;
            }
        }
        return $max;
    }

    private static function isListArray(array $arr): bool
    {
        if ($arr === []) {
            return true;
        }
        return array_keys($arr) === range(0, count($arr) - 1);
    }

    /**
     * @param array<string, mixed>|list<mixed>|null $raw
     * @return list<array{lat: float, lng: float}>|null
     */
    public static function normalizeVertices(?array $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        $list = null;
        if (self::isListArray($raw) && isset($raw[0]) && is_array($raw[0])) {
            $looksLikeVertex = isset($raw[0]['lat']) || isset($raw[0][0]);
            if ($looksLikeVertex) {
                $list = $raw;
            }
        }
        if ($list === null && isset($raw['vertices']) && is_array($raw['vertices'])) {
            $list = $raw['vertices'];
        }
        if (!is_array($list) || count($list) < 3) {
            return null;
        }
        $vertices = [];
        foreach ($list as $item) {
            if (!is_array($item)) {
                return null;
            }
            if (self::isListArray($item) && count($item) >= 2) {
                $lat = (float) $item[0];
                $lng = (float) $item[1];
            } else {
                $lat = isset($item['lat']) ? (float) $item['lat'] : NAN;
                $lng = isset($item['lng']) ? (float) $item['lng'] : NAN;
            }
            if (!is_finite($lat) || !is_finite($lng)) {
                return null;
            }
            $vertices[] = ['lat' => $lat, 'lng' => $lng];
        }
        return $vertices;
    }

    /**
     * @param list<array{lat: float, lng: float}> $vertices
     * @return array{min_lat: float, max_lat: float, min_lng: float, max_lng: float, vertices: list<array{lat: float, lng: float}>}
     */
    public static function polygonPayload(array $vertices): array
    {
        $bounds = self::verticesToBounds($vertices);
        $bounds['vertices'] = $vertices;
        return $bounds;
    }

    /**
     * @param list<array{lat: float, lng: float}> $vertices
     */
    public static function pointInPolygon(float $lat, float $lng, array $vertices): bool
    {
        if (count($vertices) < 3) {
            return false;
        }
        $inside = false;
        $n = count($vertices);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $yi = (float) $vertices[$i]['lat'];
            $yj = (float) $vertices[$j]['lat'];
            $xi = (float) $vertices[$i]['lng'];
            $xj = (float) $vertices[$j]['lng'];
            $intersect = (($yi > $lat) !== ($yj > $lat))
                && ($lng < (($xj - $xi) * ($lat - $yi)) / (($yj - $yi) + 1e-15) + $xi);
            if ($intersect) {
                $inside = !$inside;
            }
        }
        return $inside;
    }

    /**
     * @param array<string, mixed>|null $rawBounds
     * @return array{vertices: list<array{lat: float, lng: float}>, bounds: array, radius_km: float}|null
     */
    public static function sanitizePolygonInput(
        float $centerLat,
        float $centerLng,
        ?array $rawBounds,
        float $maxKm
    ): ?array {
        $vertices = self::normalizeVertices($rawBounds);
        if ($vertices === null || count($vertices) !== self::COVERAGE_VERTEX_COUNT) {
            return null;
        }
        $clamped = self::clampVerticesToMaxKm($centerLat, $centerLng, $vertices, $maxKm);
        return [
            'vertices' => $clamped,
            'bounds' => self::polygonPayload($clamped),
            'radius_km' => self::maxVertexDistanceKm($centerLat, $centerLng, $clamped),
        ];
    }
}
