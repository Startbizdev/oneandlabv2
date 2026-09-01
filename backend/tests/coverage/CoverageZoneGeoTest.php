<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/CoverageZoneGeo.php';
require_once __DIR__ . '/../../lib/CoverageZoneMatcher.php';

final class CoverageZoneGeoTest extends TestCase
{
    private const PARIS_LAT = 48.8566;
    private const PARIS_LNG = 2.3522;

    public function testHalfSideKmToBoundsAndBack(): void
    {
        $bounds = CoverageZoneGeo::halfSideKmToBounds(self::PARIS_LAT, self::PARIS_LNG, 20.0);
        $half = CoverageZoneGeo::boundsToHalfSideKm(self::PARIS_LAT, self::PARIS_LNG, $bounds);
        $this->assertEqualsWithDelta(20.0, $half, 0.5);
    }

    public function testClampHalfSideKm(): void
    {
        $this->assertSame(5.0, CoverageZoneGeo::clampHalfSideKm(2.0, 20.0));
        $this->assertSame(20.0, CoverageZoneGeo::clampHalfSideKm(50.0, 20.0));
        $this->assertSame(15.0, CoverageZoneGeo::clampHalfSideKm(15.0, 20.0));
    }

    public function testIsPointInBounds(): void
    {
        $bounds = CoverageZoneGeo::halfSideKmToBounds(self::PARIS_LAT, self::PARIS_LNG, 10.0);
        $this->assertTrue(CoverageZoneGeo::isPointInBounds(self::PARIS_LAT, self::PARIS_LNG, $bounds));
        $this->assertFalse(CoverageZoneGeo::isPointInBounds(self::PARIS_LAT + 1.0, self::PARIS_LNG, $bounds));
    }

    public function testBoundsConsistency(): void
    {
        $bounds = CoverageZoneGeo::halfSideKmToBounds(self::PARIS_LAT, self::PARIS_LNG, 12.0);
        $this->assertTrue(CoverageZoneGeo::boundsAreSquareConsistent(self::PARIS_LAT, self::PARIS_LNG, $bounds));
    }

    public function testResolveZoneBoundsFromRadiusWhenNoJson(): void
    {
        $bounds = CoverageZoneGeo::resolveZoneBounds('square', self::PARIS_LAT, self::PARIS_LNG, 8.0, null);
        $half = CoverageZoneGeo::boundsToHalfSideKm(self::PARIS_LAT, self::PARIS_LNG, $bounds);
        $this->assertEqualsWithDelta(8.0, $half, 0.3);
    }
}
