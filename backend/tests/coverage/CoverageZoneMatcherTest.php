<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/CoverageZoneGeo.php';
require_once __DIR__ . '/../../lib/CoverageZoneMatcher.php';

final class CoverageZoneMatcherTest extends TestCase
{
    public function testSquareZoneInside(): void
    {
        $centerLat = 48.8566;
        $centerLng = 2.3522;
        $bounds = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, 15.0);
        $zone = [
            'zone_type' => 'square',
            'radius_km' => 15.0,
            'center_lat' => $centerLat,
            'center_lng' => $centerLng,
            'bounds_json' => json_encode($bounds),
        ];
        $addr = ['lat' => $centerLat + 0.01, 'lng' => $centerLng + 0.01];
        $this->assertTrue(CoverageZoneMatcher::appointmentInZone($centerLat, $centerLng, $zone, $addr));
    }

    public function testSquareZoneOutside(): void
    {
        $centerLat = 48.8566;
        $centerLng = 2.3522;
        $bounds = CoverageZoneGeo::halfSideKmToBounds($centerLat, $centerLng, 5.0);
        $zone = [
            'zone_type' => 'square',
            'radius_km' => 5.0,
            'center_lat' => $centerLat,
            'center_lng' => $centerLng,
            'bounds_json' => json_encode($bounds),
        ];
        $addr = ['lat' => $centerLat, 'lng' => $centerLng];
        $this->assertFalse(CoverageZoneMatcher::appointmentInZone(50.0, 3.0, $zone, $addr));
    }

    public function testLegacyCircleZone(): void
    {
        $centerLat = 48.8566;
        $centerLng = 2.3522;
        $zone = [
            'zone_type' => 'circle',
            'radius_km' => 20.0,
            'center_lat' => $centerLat,
            'center_lng' => $centerLng,
        ];
        $addr = ['lat' => $centerLat, 'lng' => $centerLng];
        $this->assertTrue(CoverageZoneMatcher::appointmentInZone($centerLat, $centerLng, $zone, $addr));
    }

    public function testUsesProfileAddressAsCenter(): void
    {
        $bounds = CoverageZoneGeo::halfSideKmToBounds(48.9, 2.4, 10.0);
        $zone = [
            'zone_type' => 'square',
            'radius_km' => 10.0,
            'center_lat' => 48.0,
            'center_lng' => 2.0,
            'bounds_json' => json_encode($bounds),
        ];
        $addr = ['lat' => 48.9, 'lng' => 2.4];
        $this->assertTrue(CoverageZoneMatcher::appointmentInZone(48.9, 2.4, $zone, $addr));
    }
}
