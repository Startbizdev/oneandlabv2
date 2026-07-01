<?php

declare(strict_types=1);

final class TourProximity
{
    private const EARTH_RADIUS_KM = 6371.0;

    /**
     * @return array{lat: float, lng: float}|null
     */
    public static function coordsFromAppointment(array $apt): ?array
    {
        $fd = is_array($apt['form_data'] ?? null) ? $apt['form_data'] : [];
        $addr = $fd['address'] ?? null;
        if (is_array($addr)) {
            $lat = (float) ($addr['lat'] ?? 0);
            $lng = (float) ($addr['lng'] ?? 0);
            if ($lat !== 0.0 || $lng !== 0.0) {
                return ['lat' => $lat, 'lng' => $lng];
            }
        }
        $lat = (float) ($apt['location_lat'] ?? 0);
        $lng = (float) ($apt['location_lng'] ?? 0);
        if ($lat !== 0.0 || $lng !== 0.0) {
            return ['lat' => $lat, 'lng' => $lng];
        }

        return null;
    }

    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $toRad = static fn (float $d): float => $d * M_PI / 180.0;
        $dLat = $toRad($lat2 - $lat1);
        $dLng = $toRad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos($toRad($lat1)) * cos($toRad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * self::EARTH_RADIUS_KM * asin(min(1.0, sqrt($a)));
    }

    public static function estimateDriveMin(float $distanceKm): int
    {
        if ($distanceKm <= 0) {
            return 0;
        }

        return max(1, (int) round(($distanceKm / 35.0) * 60.0));
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @return list<array<string, mixed>>
     */
    public static function nearestNeighborOrder(array $appointments, ?array $start): array
    {
        if ($appointments === []) {
            return [];
        }
        $withCoords = [];
        $without = [];
        foreach ($appointments as $apt) {
            $c = self::coordsFromAppointment($apt);
            if ($c !== null) {
                $withCoords[] = ['apt' => $apt, 'coords' => $c];
            } else {
                $without[] = $apt;
            }
        }
        if ($withCoords === []) {
            return $appointments;
        }

        $cursor = $start ?? $withCoords[0]['coords'];
        $remaining = $withCoords;
        $ordered = [];

        while ($remaining !== []) {
            $bestIdx = 0;
            $bestDist = PHP_FLOAT_MAX;
            foreach ($remaining as $i => $row) {
                $d = self::haversineKm(
                    (float) $cursor['lat'],
                    (float) $cursor['lng'],
                    (float) $row['coords']['lat'],
                    (float) $row['coords']['lng'],
                );
                if ($d < $bestDist) {
                    $bestDist = $d;
                    $bestIdx = $i;
                }
            }
            $pick = $remaining[$bestIdx];
            unset($remaining[$bestIdx]);
            $remaining = array_values($remaining);
            $ordered[] = $pick['apt'];
            $cursor = $pick['coords'];
        }

        return array_merge($ordered, $without);
    }

    public static function addressKey(array $apt): string
    {
        $fd = is_array($apt['form_data'] ?? null) ? $apt['form_data'] : [];
        $addr = $fd['address'] ?? $apt['address'] ?? '';
        if (is_array($addr)) {
            $label = trim((string) ($addr['label'] ?? ''));
            $lat = round((float) ($addr['lat'] ?? 0), 4);
            $lng = round((float) ($addr['lng'] ?? 0), 4);
            if ($lat !== 0.0 || $lng !== 0.0) {
                return "{$lat},{$lng}";
            }

            return mb_strtolower($label);
        }

        return mb_strtolower(trim((string) $addr));
    }
}
