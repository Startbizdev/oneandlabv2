#!/usr/bin/env php
<?php
/**
 * Simulation dispatch zones carrées — sans base de données.
 * Usage: php backend/scripts/simulate-coverage-dispatch.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/CoverageZoneGeo.php';
require_once __DIR__ . '/../lib/CoverageZoneMatcher.php';

function ok(bool $cond, string $label): void
{
    echo ($cond ? '[OK] ' : '[FAIL] ') . $label . PHP_EOL;
    if (!$cond) {
        exit(1);
    }
}

$centerLat = 48.8566;
$centerLng = 2.3522;
$halfSide = 15.0;

echo "=== Simulation zones carrées (Paris centre) ===" . PHP_EOL . PHP_EOL;

$bounds = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, $halfSide);
echo "Bounds 15 km demi-côté:" . PHP_EOL;
echo json_encode($bounds, JSON_PRETTY_PRINT) . PHP_EOL . PHP_EOL;

$zoneSquare = [
    'zone_type' => 'square',
    'radius_km' => $halfSide,
    'center_lat' => $centerLat,
    'center_lng' => $centerLng,
    'bounds_json' => json_encode($bounds),
];
$profAddr = ['lat' => $centerLat, 'lng' => $centerLng];

// RDV au centre → inside
ok(
    CoverageZoneMatcher::appointmentInZone($centerLat, $centerLng, $zoneSquare, $profAddr),
    'RDV au centre dans zone 15 km'
);

// RDV proche (~5 km nord) → inside
$nearLat = $centerLat + (5.0 / 111.32);
ok(
    CoverageZoneMatcher::appointmentInZone($nearLat, $centerLng, $zoneSquare, $profAddr),
    'RDV ~5 km nord dans zone 15 km'
);

// RDV au coin (~15 km NE) → inside (sur le bord)
$cornerLat = $centerLat + ($halfSide / 111.32);
$cornerLng = $centerLng + ($halfSide / CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, 1.0)['max_lng'] - $centerLng) * $halfSide;
// simpler: use bounds max
ok(
    CoverageZoneMatcher::appointmentInZone($bounds['max_lat'], $bounds['max_lng'], $zoneSquare, $profAddr),
    'RDV au coin NE (bord carré) dans zone'
);

// RDV hors zone (Lille ~220 km)
ok(
    !CoverageZoneMatcher::appointmentInZone(50.6292, 3.0573, $zoneSquare, $profAddr),
    'RDV Lille hors zone 15 km Paris'
);

// Legacy circle 20 km — patient à 18 km → inside circle but might be outside square 15km
$zoneCircle = [
    'zone_type' => 'circle',
    'radius_km' => 20.0,
    'center_lat' => $centerLat,
    'center_lng' => $centerLng,
];
ok(
    CoverageZoneMatcher::appointmentInZone($centerLat + 0.12, $centerLng, $zoneCircle, $profAddr),
    'Legacy cercle 20 km — RDV ~13 km nord dedans'
);

// Migration legacy → carré : demi-côté = ancien rayon
$legacyHalf = 20.0;
$legacyBounds = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, $legacyHalf);
$zoneMigrated = [
    'zone_type' => 'square',
    'radius_km' => $legacyHalf,
    'center_lat' => $centerLat,
    'center_lng' => $centerLng,
    'bounds_json' => json_encode($legacyBounds),
];
$apt18kmLat = $centerLat + (18.0 / 111.32);
ok(
    CoverageZoneMatcher::appointmentInZone($apt18kmLat, $centerLng, $zoneCircle, $profAddr),
    'Legacy cercle 20 km — RDV 18 km nord dedans'
);
ok(
    CoverageZoneMatcher::appointmentInZone($apt18kmLat, $centerLng, $zoneMigrated, $profAddr),
    'Carré 20 km demi-côté — RDV 18 km nord dedans'
);

$smallSquare = [
    'zone_type' => 'square',
    'radius_km' => 15.0,
    'center_lat' => $centerLat,
    'center_lng' => $centerLng,
    'bounds_json' => json_encode(CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, 15.0)),
];
$apt18kmInCircleNotSquare = CoverageZoneMatcher::appointmentInZone($apt18kmLat, $centerLng, $zoneCircle, $profAddr)
    && !CoverageZoneMatcher::appointmentInZone($apt18kmLat, $centerLng, $smallSquare, $profAddr);
ok($apt18kmInCircleNotSquare, 'RDV 18 km nord: cercle 20 km oui, carré 15 km demi-côté non');

// Bounds cohérence
ok(
    CoverageZoneGeo::boundsAreSquareConsistent($centerLat, $centerLng, $bounds),
    'Bounds cohérents avec centre + demi-côté'
);

// Plan limit clamp (Discovery 20 km max)
$clamped = CoverageZoneGeo::clampHalfSideKm(25.0, 20.0);
ok($clamped === 20.0, 'Clamp demi-côté 25 → max plan 20 km');

$square = CoverageZoneGeo::defaultSquareSixVertices($centerLat, $centerLng, 15.0);
ok(count($square) === 6, 'Carré 6 sommets');
$zonePoly = [
    'zone_type' => 'polygon',
    'radius_km' => 15.0,
    'center_lat' => $centerLat,
    'center_lng' => $centerLng,
    'bounds_json' => json_encode(CoverageZoneGeo::polygonPayload($square)),
];
ok(
    CoverageZoneMatcher::appointmentInZone($centerLat, $centerLng, $zonePoly, $profAddr),
    'RDV au centre dans polygone 15 km'
);
ok(
    !CoverageZoneMatcher::appointmentInZone(50.6292, 3.0573, $zonePoly, $profAddr),
    'RDV Lille hors polygone 15 km Paris'
);

echo PHP_EOL . '=== Simulation OK ===' . PHP_EOL;

echo PHP_EOL . '=== Toutes les simulations OK ===' . PHP_EOL;
