<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/ClinicalVitalTypes.php';

final class ClinicalVitalTypesTest extends TestCase
{
    public function testValidTypes(): void
    {
        $this->assertTrue(ClinicalVitalTypes::isValid('blood_pressure'));
        $this->assertTrue(ClinicalVitalTypes::isValid('heart_rate'));
        $this->assertFalse(ClinicalVitalTypes::isValid('steps'));
    }

    public function testBloodPressureHasSecondary(): void
    {
        $meta = ClinicalVitalTypes::meta('blood_pressure');
        $this->assertNotNull($meta);
        $this->assertTrue($meta['has_secondary']);
        $this->assertSame('mmHg', $meta['unit']);
    }

    public function testCatalogCount(): void
    {
        $this->assertCount(7, ClinicalVitalTypes::catalog());
    }
}
