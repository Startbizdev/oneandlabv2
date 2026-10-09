<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AvailabilityTimeLabel.php';
require_once __DIR__ . '/../../lib/NotificationMessageFormatter.php';

/** Les créneaux au quart d'heure gardent leurs minutes dans les e-mails et notifications. */
final class AvailabilityTimeLabelTest extends TestCase
{
    public function testWholeHoursStayShort(): void
    {
        $this->assertSame('8h - 10h', AvailabilityTimeLabel::range([8, 10]));
    }

    public function testQuarterHoursKeepTheirMinutes(): void
    {
        $this->assertSame('7h45 - 8h45', AvailabilityTimeLabel::range([7.75, 8.75]));
        $this->assertSame('12h30 – 13h30', AvailabilityTimeLabel::range(['12.5', '13.5'], ' – '));
    }

    public function testNotificationSlotLabelShowsMinutes(): void
    {
        $formData = ['availability' => ['type' => 'custom', 'range' => [7.75, 8.75]]];

        $this->assertSame('7h45-8h45', NotificationMessageFormatter::availabilitySlotLabel($formData));
    }

    public function testShareSuffixShowsMinutesAndKeepsNamedSlots(): void
    {
        $this->assertSame(
            ' à 7h45 - 8h45',
            NotificationMessageFormatter::shareCreneauSuffix(['availability' => ['type' => 'custom', 'range' => [7.75, 8.75]]]),
        );
        $this->assertSame(
            ' le matin',
            NotificationMessageFormatter::shareCreneauSuffix(['availability' => ['type' => 'custom', 'range' => [8, 12]]]),
        );
    }
}
