<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/CoverageZoneGeo.php';

/**
 * Validation demi-côté selon plan (logique extraite de coverage-zones API).
 */
final class CoverageZonePlanLimitTest extends TestCase
{
    private function validateNurseHalfSide(float $halfSideKm, float $maxRadiusKm): ?string
    {
        if ($halfSideKm > $maxRadiusKm) {
            return 'PLAN_LIMIT';
        }
        if ($halfSideKm < CoverageZoneGeo::MIN_HALF_SIDE_KM) {
            return 'MIN_LIMIT';
        }
        return null;
    }

    public function testDiscoveryMax20Km(): void
    {
        $this->assertSame('PLAN_LIMIT', $this->validateNurseHalfSide(25.0, 20.0));
        $this->assertNull($this->validateNurseHalfSide(20.0, 20.0));
        $this->assertNull($this->validateNurseHalfSide(10.0, 20.0));
    }

    public function testProMax100Km(): void
    {
        $this->assertNull($this->validateNurseHalfSide(80.0, 100.0));
        $this->assertSame('PLAN_LIMIT', $this->validateNurseHalfSide(101.0, 100.0));
    }

    public function testMinHalfSide(): void
    {
        $this->assertSame('MIN_LIMIT', $this->validateNurseHalfSide(3.0, 20.0));
    }
}
