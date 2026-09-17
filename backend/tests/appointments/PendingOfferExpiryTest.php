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

    public function testOldAppointmentRepublishedGetsANewFullWindow(): void
    {
        $oldCreatedAt = $this->paris('2020-01-01 10:00:00');
        $republishedAt = $this->paris('2026-09-10 14:00:00');

        $oldExpiry = PendingOfferExpiry::computeExpiresAt($oldCreatedAt);
        $republishedExpiry = PendingOfferExpiry::computeRepublishedExpiresAt($republishedAt);

        $this->assertLessThan($republishedAt, $oldExpiry);
        $this->assertSame('2026-09-10 16:00:00', $republishedExpiry->format('Y-m-d H:i:s'));
        $this->assertGreaterThan($republishedAt, $republishedExpiry);
    }

    public function testCronDoesNotSelectRepublishedOldAppointmentBeforeNewTtl(): void
    {
        if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('Extension PDO SQLite indisponible.');
        }

        $now = AppTimezone::now();
        $expiresAt = PendingOfferExpiry::computeRepublishedExpiresAt($now);
        $db = new PDO('sqlite::memory:');
        $db->exec('
            CREATE TABLE appointments (
                id TEXT PRIMARY KEY,
                type TEXT,
                status TEXT,
                assigned_nurse_id TEXT,
                assigned_lab_id TEXT,
                created_at TEXT,
                pending_offer_expires_at TEXT
            )
        ');
        $insert = $db->prepare('
            INSERT INTO appointments
                (id, type, status, assigned_nurse_id, assigned_lab_id, created_at, pending_offer_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $insert->execute([
            'old-republished',
            'nursing',
            'pending',
            null,
            null,
            '2020-01-01 10:00:00',
            PendingOfferExpiry::formatSqlDateTime($expiresAt),
        ]);

        $readySql = PendingOfferExpiry::sqlReadyToExpire('a');
        $selected = (int) $db->query(
            "SELECT COUNT(*) FROM appointments a
             WHERE a.status = 'pending'
             AND a.type = 'nursing'
             AND (a.assigned_nurse_id IS NULL OR TRIM(a.assigned_nurse_id) = '')
             AND {$readySql}"
        )->fetchColumn();

        $this->assertGreaterThan($now, $expiresAt);
        $this->assertSame(0, $selected);
    }
}
