<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/PendingOfferExpiry.php';
require_once __DIR__ . '/../../lib/AppTimezone.php';

final class PendingOfferExpiryTest extends TestCase
{
    private function paris(string $ymdHis): DateTimeImmutable
    {
        return new DateTimeImmutable($ymdHis, new DateTimeZone(AppTimezone::TZ));
    }

    public function testDaytimeExpiresTwoHoursLater(): void
    {
        $created = $this->paris('2026-09-10 14:00:00');
        $expires = PendingOfferExpiry::computeExpiresAt($created);
        $this->assertSame('2026-09-10 16:00:00', $expires->format('Y-m-d H:i:s'));
    }

    public function testEveningExpiresNextMorningEight(): void
    {
        $created = $this->paris('2026-09-10 22:00:00');
        $expires = PendingOfferExpiry::computeExpiresAt($created);
        $this->assertSame('2026-09-11 08:00:00', $expires->format('Y-m-d H:i:s'));
    }

    public function testEarlyMorningExpiresSameDayEight(): void
    {
        $created = $this->paris('2026-09-10 05:30:00');
        $expires = PendingOfferExpiry::computeExpiresAt($created);
        $this->assertSame('2026-09-10 08:00:00', $expires->format('Y-m-d H:i:s'));
    }

    public function testOffHoursBoundaryAtSixPm(): void
    {
        $created = $this->paris('2026-09-10 18:00:00');
        $expires = PendingOfferExpiry::computeExpiresAt($created);
        $this->assertSame('2026-09-11 08:00:00', $expires->format('Y-m-d H:i:s'));
    }

    public function testShouldTrackOnlyUnassignedPending(): void
    {
        $this->assertTrue(PendingOfferExpiry::shouldTrackOfferExpiry('pending', 'nursing', null, null));
        $this->assertFalse(PendingOfferExpiry::shouldTrackOfferExpiry('pending', 'nursing', 'nurse-id', null));
        $this->assertTrue(PendingOfferExpiry::shouldTrackOfferExpiry('pending', 'blood_test', null, null));
        $this->assertFalse(PendingOfferExpiry::shouldTrackOfferExpiry('confirmed', 'blood_test', null, null));
    }
}
