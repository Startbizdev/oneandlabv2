<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../models/Appointment.php';

use PHPUnit\Framework\TestCase;

/**
 * Caractérisation getById / decrypt via façade Appointment.
 */
final class AppointmentGetByIdTest extends TestCase
{
    use SkipsWithoutPdo;

    public function testDecryptViaFacadeMatchesFormDataCrypto(): void
    {
        $crypto = new Crypto();
        $logger = $this->createMock(Logger::class);
        $svc = new AppointmentFormDataCrypto($crypto, $logger);

        $enc = $crypto->encryptField('7 rue Cary');
        $row = [
            'id' => 'apt-1',
            'address_encrypted' => $enc['encrypted'],
            'address_dek' => $enc['dek'],
            'form_data_encrypted' => null,
            'form_data_dek' => null,
        ];
        $out = $svc->decryptRowForList($row, TestFixtures::NURSE, 'nurse');
        $this->assertSame('7 rue Cary', $out['address']);
    }

    public function testAppointmentConstructWithInjectedPdo(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $pdo = TestDatabase::pdo();
        $apt = new Appointment($pdo);
        $this->assertInstanceOf(Appointment::class, $apt);
        // getById inconnu => null/false selon implémentation
        $missing = $apt->getById('00000000-0000-4000-8000-ffffffffffff', TestFixtures::ADMIN, 'super_admin');
        $this->assertTrue($missing === null || $missing === false || $missing === []);
    }
}
