<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/HealthService.php';

final class HealthMetricTypesTest extends TestCase
{
    public function testValidMetricTypes(): void
    {
        $this->assertTrue(HealthMetricTypes::isValid('weight'));
        $this->assertTrue(HealthMetricTypes::isValid('heart_rate'));
        $this->assertFalse(HealthMetricTypes::isValid('blood_pressure'));
    }

    public function testDefaultUnits(): void
    {
        $this->assertSame('kg', HealthMetricTypes::defaultUnit('weight'));
        $this->assertSame('bpm', HealthMetricTypes::defaultUnit('heart_rate'));
        $this->assertSame('count', HealthMetricTypes::defaultUnit('steps'));
    }
}
