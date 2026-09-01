<?php

require_once __DIR__ . '/CoverageZoneGeo.php';

/**
 * Matching RDV ↔ zone de couverture (polygone, carré ou cercle legacy).
 */
final class CoverageZoneMatcher
{
    /**
     * @param array<string, mixed> $zone Ligne coverage_zones + champs profil optionnels
     * @param array{lat: float, lng: float}|null $profAddress Adresse déchiffrée du pro
     */
    public static function appointmentInZone(
        float $aptLat,
        float $aptLng,
        array $zone,
        ?array $profAddress
    ): bool {
        $zoneType = isset($zone['zone_type']) ? (string) $zone['zone_type'] : 'square';
        $radiusKm = isset($zone['radius_km']) ? (float) $zone['radius_km'] : 0.0;

        $centerLat = null;
        $centerLng = null;
        if ($profAddress !== null && isset($profAddress['lat'], $profAddress['lng'])) {
            $centerLat = (float) $profAddress['lat'];
            $centerLng = (float) $profAddress['lng'];
        } elseif (isset($zone['center_lat'], $zone['center_lng'])) {
            $centerLat = (float) $zone['center_lat'];
            $centerLng = (float) $zone['center_lng'];
        }

        if ($centerLat === null || $centerLng === null) {
            return false;
        }

        if ($zoneType === 'circle') {
            return self::pointInCircle($aptLat, $aptLng, $centerLat, $centerLng, $radiusKm);
        }

        $boundsJson = null;
        if (isset($zone['bounds_json'])) {
            if (is_string($zone['bounds_json'])) {
                $decoded = json_decode($zone['bounds_json'], true);
                $boundsJson = is_array($decoded) ? $decoded : null;
            } elseif (is_array($zone['bounds_json'])) {
                $boundsJson = $zone['bounds_json'];
            }
        }

        $vertices = CoverageZoneGeo::normalizeVertices($boundsJson);
        if ($vertices !== null && count($vertices) >= 3) {
            return CoverageZoneGeo::pointInPolygon($aptLat, $aptLng, $vertices);
        }

        $bounds = CoverageZoneGeo::resolveZoneBounds(
            $zoneType,
            $centerLat,
            $centerLng,
            $radiusKm,
            $boundsJson
        );

        return CoverageZoneGeo::isPointInBounds($aptLat, $aptLng, $bounds);
    }

    private static function pointInCircle(
        float $aptLat,
        float $aptLng,
        float $centerLat,
        float $centerLng,
        float $radiusKm
    ): bool {
        if ($radiusKm <= 0) {
            return false;
        }
        $distance = 6371 * acos(
            min(1.0, max(-1.0,
                cos(deg2rad($aptLat)) * cos(deg2rad($centerLat)) *
                cos(deg2rad($centerLng) - deg2rad($aptLng)) +
                sin(deg2rad($aptLat)) * sin(deg2rad($centerLat))
            ))
        );
        return $distance <= $radiusKm;
    }

    /**
     * Bbox SQL pre-filter (deg) autour d'un centre pour demi-côté max km.
     */
    public static function bboxDeltaDegrees(float $centerLat, float $maxHalfSideKm): array
    {
        $latDelta = $maxHalfSideKm / 111.32;
        $lngDelta = $maxHalfSideKm / max(0.01, 111.32 * abs(cos(deg2rad($centerLat))));
        return ['lat' => $latDelta, 'lng' => $lngDelta];
    }
}
