<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';

use PHPUnit\Framework\TestCase;

final class AppointmentFormDataCryptoTest extends TestCase
{
    use SkipsWithoutPdo;

    public function testExtractAddressLabelFromStringAndArray(): void
    {
        $crypto = new Crypto();
        $logger = $this->createMock(Logger::class);
        $svc = new AppointmentFormDataCrypto($crypto, $logger);

        $this->assertSame('12 rue Test', $svc->extractAddressLabel('12 rue Test'));
        $this->assertSame('Paris', $svc->extractAddressLabel(['label' => 'Paris']));
        $this->assertSame('Lyon', $svc->extractAddressLabel(json_encode(['label' => 'Lyon'])));
        $this->assertSame('', $svc->extractAddressLabel(null));
    }

    public function testHydrateAddressFieldsFillsFormData(): void
    {
        $crypto = new Crypto();
        $logger = $this->createMock(Logger::class);
        $svc = new AppointmentFormDataCrypto($crypto, $logger);

        $appointment = [
            'address' => '10 rue Exemple',
            'form_data' => [],
            'location_lat' => 48.86,
            'location_lng' => 2.34,
        ];
        $svc->hydrateAddressFields($appointment);
        $this->assertSame('10 rue Exemple', $appointment['address']);
        $this->assertSame('10 rue Exemple', $appointment['form_data']['address_label']);
        $this->assertSame('10 rue Exemple', $appointment['form_data']['address']['label']);
    }

    public function testDecryptRoundTripOnEncryptedFields(): void
    {
        if (!extension_loaded('pdo_mysql') && !TestDatabase::isConfigured()) {
            $this->markTestSkipped('pdo_mysql / TEST_DATABASE_DSN');
        }
        $crypto = new Crypto();
        $logger = $this->createMock(Logger::class);
        $logger->expects($this->once())->method('logDecrypt');
        $svc = new AppointmentFormDataCrypto($crypto, $logger);

        $encAddr = $crypto->encryptField('5 avenue Test');
        $encForm = $crypto->encryptField(json_encode(['note' => 'ok'], JSON_THROW_ON_ERROR));

        $row = [
            'id' => TestFixtures::PATIENT_A,
            'address_encrypted' => $encAddr['encrypted'],
            'address_dek' => $encAddr['dek'],
            'form_data_encrypted' => $encForm['encrypted'],
            'form_data_dek' => $encForm['dek'],
            'created_at' => '2026-01-01',
            'updated_at' => '2026-01-01',
        ];
        $out = $svc->decryptRowForList($row, TestFixtures::PATIENT_A, 'patient');
        $this->assertSame('5 avenue Test', $out['address']);
        $this->assertSame('ok', $out['form_data']['note']);
        $this->assertArrayNotHasKey('created_at', $out);
        $this->assertArrayNotHasKey('address_encrypted', $out);
    }
}
