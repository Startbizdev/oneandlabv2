<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/nurse-passage/PassageDateExpander.php';
require_once __DIR__ . '/../../lib/nurse-passage/PassageSlotResolver.php';

final class PassageDateExpanderTest extends TestCase
{
    public function testIntervalEveryThreeDaysWithEnd(): void
    {
        $dates = PassageDateExpander::expand('interval', [
            'every_days' => 3,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-10',
        ]);
        $this->assertSame(['2026-07-01', '2026-07-04', '2026-07-07', '2026-07-10'], $dates);
    }

    public function testWeekdaysMondayAndThursday(): void
    {
        $dates = PassageDateExpander::expand('weekdays', [
            'weekdays' => [1, 4],
            'start_date' => '2026-07-06',
            'end_date' => '2026-07-16',
        ]);
        $this->assertContains('2026-07-06', $dates);
        $this->assertContains('2026-07-09', $dates);
        $this->assertNotContains('2026-07-07', $dates);
    }

    public function testCustomDates(): void
    {
        $dates = PassageDateExpander::expand('custom_dates', [
            'dates' => ['2026-09-06', '2026-09-14'],
        ]);
        $this->assertSame(['2026-09-06', '2026-09-14'], $dates);
    }

    public function testManualSingleDay(): void
    {
        $dates = PassageDateExpander::expand('manual', ['start_date' => '2026-08-01']);
        $this->assertSame(['2026-08-01'], $dates);
    }

    public function testIntervalWithoutEndCapsAt90Days(): void
    {
        $dates = PassageDateExpander::expand('interval', [
            'every_days' => 30,
            'start_date' => '2026-01-01',
        ]);
        $this->assertCount(3, $dates);
        $this->assertSame('2026-01-01', $dates[0]);
        $this->assertSame('2026-03-02', $dates[2]);
    }

    public function testSingleDayWithEndDateDailyRange(): void
    {
        $dates = PassageDateExpander::expand('single_day', [
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-07',
        ]);
        $this->assertCount(7, $dates);
        $this->assertSame('2026-07-01', $dates[0]);
        $this->assertSame('2026-07-07', $dates[6]);
    }

    public function testIntervalOpenEndedUses365DayHorizon(): void
    {
        $dates = PassageDateExpander::expand('interval', [
            'every_days' => 7,
            'start_date' => '2026-01-01',
            'open_ended' => true,
        ]);
        $this->assertGreaterThan(50, count($dates));
        $this->assertSame('2026-01-01', $dates[0]);
        $this->assertSame('2026-12-31', $dates[count($dates) - 1]);
    }

    public function testMorningSlotScheduledAt(): void
    {
        $at = PassageSlotResolver::scheduledAt('2026-07-15', 'morning', null);
        $this->assertSame('2026-07-15 08:00:00', $at);
    }

    public function testCustomSlotScheduledAt(): void
    {
        $at = PassageSlotResolver::scheduledAt('2026-07-15', 'custom', '10:30');
        $this->assertSame('2026-07-15 10:30:00', $at);
    }
}
