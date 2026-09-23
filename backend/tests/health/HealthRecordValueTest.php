<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/HealthRecordValue.php';

final class HealthRecordValueTest extends TestCase
{
    public function testUnwrapNestedValue(): void
    {
        $this->assertNull(HealthRecordValue::unwrap(['value' => ['value' => null]]));
        $this->assertSame('yes', HealthRecordValue::unwrap(['value' => 'yes']));
    }

    public function testUnwrapObjectObjectString(): void
    {
        $this->assertNull(HealthRecordValue::unwrap('[object Object]'));
        $this->assertNull(HealthRecordValue::fromPayload(['value' => '[object Object]']));
    }

    public function testFromPayloadDoubleEnvelope(): void
    {
        $this->assertNull(HealthRecordValue::fromPayload(['value' => ['value' => null]]));
        $this->assertFalse(HealthRecordValue::isFilled(['value' => ['value' => null]]));
    }
}
