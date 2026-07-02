<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/nurse-passage/PassageDateExpander.php';
require_once __DIR__ . '/../../lib/nurse-passage/PassageSlotResolver.php';
require_once __DIR__ . '/../../lib/nurse-passage/PassageMaterializer.php';

final class PassageMaterializerTest extends TestCase
{
    public function testNormalizeNursingItemsForFormPreservesCareOptions(): void
    {
        $items = PassageMaterializer::normalizeNursingItemsForForm([
            [
                'category_id' => 'cat-1',
                'label' => 'Pansement',
                'care_options' => ['frequency' => 'daily'],
            ],
            ['category_id' => 'cat-2', 'label' => 'Prise de sang'],
        ]);

        $this->assertCount(2, $items);
        $this->assertSame('cat-1', $items[0]['category_id']);
        $this->assertSame(['frequency' => 'daily'], $items[0]['care_options']);
        $this->assertSame(0, $items[0]['sort_order']);
        $this->assertSame(1, $items[1]['sort_order']);
        $this->assertSame([], $items[1]['care_options']);
    }

    public function testScheduledAtMorningSlot(): void
    {
        $scheduledAt = PassageSlotResolver::scheduledAt('2026-07-01', 'morning', null);
        $this->assertSame('2026-07-01 08:00:00', $scheduledAt);
    }

    public function testEffectiveScheduledAtSameDayPastSlotUsesNowPlusBuffer(): void
    {
        $now = new DateTimeImmutable('2026-07-02 08:48:00', new DateTimeZone('Europe/Paris'));
        $effective = PassageSlotResolver::effectiveScheduledAtForNursePassage(
            '2026-07-02',
            'morning',
            null,
            $now,
        );
        $this->assertSame('2026-07-02 08:53:00', $effective);
    }

    public function testEffectiveScheduledAtPastDayReturnsNull(): void
    {
        $now = new DateTimeImmutable('2026-07-02 10:00:00', new DateTimeZone('Europe/Paris'));
        $effective = PassageSlotResolver::effectiveScheduledAtForNursePassage(
            '2026-07-01',
            'morning',
            null,
            $now,
        );
        $this->assertNull($effective);
    }

    public function testMaterializePipelineIntervalDates(): void
    {
        $dates = PassageDateExpander::expand('interval', [
            'every_days' => 3,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-10',
        ]);
        $this->assertSame(['2026-07-01', '2026-07-04', '2026-07-07', '2026-07-10'], $dates);

        foreach ($dates as $dateYmd) {
            $scheduledAt = PassageSlotResolver::scheduledAt($dateYmd, 'morning', null);
            $this->assertSame($dateYmd . ' 08:00:00', $scheduledAt);
        }
    }

    public function testMaterializePipelineWeekdaysAllSeven(): void
    {
        $dates = PassageDateExpander::expand('weekdays', [
            'weekdays' => [1, 2, 3, 4, 5, 6, 7],
            'start_date' => '2026-07-06',
            'end_date' => '2026-07-12',
        ]);
        $this->assertCount(7, $dates);
    }

    public function testMaterializePipelineCustomDatesIdempotentExpansion(): void
    {
        $config = ['dates' => ['2026-09-14', '2026-09-06', '2026-09-14']];
        $first = PassageDateExpander::expand('custom_dates', $config);
        $second = PassageDateExpander::expand('custom_dates', $config);
        $this->assertSame(['2026-09-06', '2026-09-14'], $first);
        $this->assertSame($first, $second);
    }

    public function testManualPlanningSingleDate(): void
    {
        $dates = PassageDateExpander::expand('manual', ['start_date' => '2026-08-15']);
        $this->assertSame(['2026-08-15'], $dates);
    }
}
