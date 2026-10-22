<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/Appointment.php';

use PHPUnit\Framework\TestCase;

/**
 * Acceptation d'une offre : les notifications (push Expo, SMS) ne doivent pas retarder la réponse PUT sous PHP-FPM.
 */
final class AppointmentStatusNotificationDeferralTest extends TestCase
{
    public function testFpmDefersNotificationsUntilAfterResponse(): void
    {
        $ran = false;
        $deferred = AppointmentStatusService::runAfterResponse(static function () use (&$ran): void {
            $ran = true;
        }, 'fpm-fcgi', true);

        self::assertTrue($deferred);
        self::assertFalse($ran, 'Les notifications ne doivent pas s’exécuter avant l’envoi de la réponse.');
    }

    public function testCliAndBuiltInServerRunImmediately(): void
    {
        foreach ([['cli', true], ['cli-server', false], ['fpm-fcgi', false]] as [$sapi, $canFinish]) {
            $ran = false;
            $deferred = AppointmentStatusService::runAfterResponse(static function () use (&$ran): void {
                $ran = true;
            }, $sapi, $canFinish);

            self::assertFalse($deferred, $sapi);
            self::assertTrue($ran, $sapi);
        }
    }
}
