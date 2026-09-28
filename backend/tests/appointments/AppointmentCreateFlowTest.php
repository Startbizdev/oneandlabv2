<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../models/Appointment.php';

use PHPUnit\Framework\TestCase;

/**
 * Caractérisation création : validation minimale sans SMS (PDO injecté).
 */
final class AppointmentCreateFlowTest extends TestCase
{
    use SkipsWithoutPdo;

    public function testCreateRejectsMissingRequiredFields(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $apt = new Appointment(TestDatabase::pdo());
        $this->expectException(Throwable::class);
        $apt->create([], TestFixtures::NURSE, 'nurse');
    }

    public function testListQueryMatchesLegacyDefaults(): void
    {
        $q = AppointmentListQuery::fromArray([]);
        $this->assertSame(20, $q->limit);
        $this->assertSame('full', $q->listScope);
        $this->assertFalse($q->lightListPayload);
    }
}
