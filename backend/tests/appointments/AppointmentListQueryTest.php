<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/appointments/bootstrap.php';

use PHPUnit\Framework\TestCase;

final class AppointmentListQueryTest extends TestCase
{
    public function testParsesScopeListAsLightPayload(): void
    {
        $q = AppointmentListQuery::fromArray(['scope' => 'list', 'page' => '2', 'limit' => '24']);
        $this->assertTrue($q->lightListPayload);
        $this->assertSame('list', $q->listScope);
        $this->assertSame(2, $q->page);
        $this->assertSame(24, $q->limit);
        $this->assertSame(24, $q->offset);
    }

    public function testCalendarViewRaisesLimitCap(): void
    {
        $q = AppointmentListQuery::fromArray(['view' => 'calendar', 'limit' => '999']);
        $this->assertTrue($q->lightListPayload);
        $this->assertTrue($q->calendarView);
        $this->assertSame(250, $q->limit);
    }

    public function testDefaultsMatchApi(): void
    {
        $q = AppointmentListQuery::fromArray([]);
        $this->assertSame('full', $q->listScope);
        $this->assertFalse($q->lightListPayload);
        $this->assertSame(1, $q->page);
        $this->assertSame(20, $q->limit);
        $this->assertNull($q->patientPeriod);
    }

    public function testInvalidPatientPeriodNullified(): void
    {
        $q = AppointmentListQuery::fromArray(['patient_period' => 'tomorrow']);
        $this->assertNull($q->patientPeriod);
        $q2 = AppointmentListQuery::fromArray(['patient_period' => 'upcoming']);
        $this->assertSame('upcoming', $q2->patientPeriod);
    }
}
