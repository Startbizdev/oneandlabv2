<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AppTimezone.php';
require_once __DIR__ . '/../../lib/nurse-tour/TourIcsExporter.php';

/**
 * Convention unique : scheduled_at = heure murale de Paris sans fuseau, relue et écrite par AppTimezone.
 */
final class ParisWallClockTest extends TestCase
{
    public function testStoredWallClockIsReadAsParis(): void
    {
        $summer = AppTimezone::parseSqlDateTime('2026-07-15 08:00:00');
        $winter = AppTimezone::parseSqlDateTime('2026-12-15 08:00');

        $this->assertNotNull($summer);
        $this->assertNotNull($winter);
        $this->assertSame('2026-07-15T08:00:00+02:00', $summer->format('c'));
        $this->assertSame('2026-12-15T08:00:00+01:00', $winter->format('c'));
        $this->assertSame('2026-07-15 08:00:00', AppTimezone::sqlDateTime($summer), 'Aller-retour sans décalage');
    }

    public function testInvalidStoredValueIsRejected(): void
    {
        $this->assertNull(AppTimezone::parseSqlDateTime('2026-02-30 08:00:00'));
        $this->assertNull(AppTimezone::parseSqlDateTime('demain'));
    }

    public function testClientDateWithoutZoneIsParisAndExplicitZoneIsHonoured(): void
    {
        $this->assertSame('2026-07-15 08:00', AppTimezone::parseClientDateTime('2026-07-15T08:00:00')->format('Y-m-d H:i'));
        $this->assertSame('2026-07-15 10:00', AppTimezone::parseClientDateTime('2026-07-15T08:00:00Z')->format('Y-m-d H:i'));
    }

    public function testStartOfTodayIsParisMidnight(): void
    {
        $this->assertSame(AppTimezone::now()->format('Y-m-d') . ' 00:00:00', AppTimezone::sqlStartOfToday());
    }

    public function testIcsConvertsParisWallClockToUtc(): void
    {
        $ics = (new TourIcsExporter())->exportStops([
            ['appointment_id' => 'ete', 'scheduled_at' => '2026-07-15 08:00:00', 'patient_name' => 'Alice'],
            ['appointment_id' => 'hiver', 'scheduled_at' => '2026-12-15 08:00:00', 'patient_name' => 'Bruno'],
            ['appointment_id' => 'invalide', 'scheduled_at' => 'n/a'],
        ]);

        $this->assertStringContainsString("DTSTART:20260715T060000Z\r\nDTEND:20260715T064500Z", $ics);
        $this->assertStringContainsString("DTSTART:20261215T070000Z\r\nDTEND:20261215T074500Z", $ics);
        $this->assertStringNotContainsString('invalide@', $ics);
    }
}
