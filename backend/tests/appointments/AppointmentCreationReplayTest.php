<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AppointmentCreationRequest.php';

final class AppointmentCreationReplayTest extends TestCase
{
    public function testRejectsShortClientRequestIdWithoutTouchingDatabase(): void
    {
        $db = $this->createMock(PDO::class);
        $this->expectException(AppointmentCreationConflict::class);
        AppointmentCreationRequest::run(
            $db,
            'actor',
            'bad',
            str_repeat('a', 64),
            static fn (): string => 'should-not-run'
        );
    }

    public function testReplaySameKeyReturnsSameAppointmentId(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }

        $db = TestDatabase::pdo();
        $db->exec('CREATE TABLE IF NOT EXISTS appointment_creation_requests (
            actor_id VARCHAR(36) NOT NULL,
            request_key VARCHAR(64) NOT NULL,
            request_hash CHAR(64) NOT NULL,
            appointment_id VARCHAR(36) NULL,
            response_completed TINYINT(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (actor_id, request_key)
        ) ENGINE=InnoDB');

        $creates = 0;
        $hash = str_repeat('a', 64);
        $first = AppointmentCreationRequest::run(
            $db,
            'phpunit-actor',
            'shared-request-php1',
            $hash,
            static function () use (&$creates): string {
                $creates++;
                return 'apt-replay-1';
            }
        );
        $second = AppointmentCreationRequest::run(
            $db,
            'phpunit-actor',
            'shared-request-php1',
            $hash,
            static function () use (&$creates): string {
                $creates++;
                return 'apt-should-not-create';
            }
        );

        $this->assertSame('apt-replay-1', $first);
        $this->assertSame($first, $second);
        $this->assertSame(1, $creates);

        $db->prepare('DELETE FROM appointment_creation_requests WHERE actor_id = ?')->execute(['phpunit-actor']);
    }
}
