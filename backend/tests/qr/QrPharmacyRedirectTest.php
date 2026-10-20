<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/PharmacyFixtures.php';
require_once __DIR__ . '/../../lib/QrCodeService.php';

/**
 * QR d'une pharmacie : page de choix (rendez-vous / commande) au lieu de la prise de RDV directe,
 * y compris pour les QR déjà imprimés.
 */
final class QrPharmacyRedirectTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        foreach ($this->profileIds as $id) {
            PharmacyFixtures::deleteProfile($this->db, $id);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testPharmacyQrLeadsToTheChoicePage(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));

        $url = (new QrCodeService($this->db))->buildRedirectUrl($pharmacyId, 'pro');

        $this->assertStringEndsWith('/pharmacie/' . $pharmacyId, $url);
        $this->assertStringNotContainsString('?', $url);
    }

    public function testOtherProfessionalsStillBook(): void
    {
        $proId = $this->track(TestFixtures::insertProfile($this->db, 'pro'));

        $url = (new QrCodeService($this->db))->buildRedirectUrl($proId, 'pro');

        $this->assertStringContainsString('/rendez-vous/nouveau?', $url);
    }

    public function testModuleDisabledFallsBackToBooking(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));
        $stmt = $this->db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?');
        $stmt->execute([PharmacyModuleConfig::SETTING_KEY]);
        $previous = $stmt->fetchColumn();
        (new PharmacyModuleConfig($this->db))->saveConfig(['module_enabled' => false]);
        try {
            $url = (new QrCodeService($this->db))->buildRedirectUrl($pharmacyId, 'pro');
        } finally {
            if ($previous === false) {
                $this->db->prepare('DELETE FROM platform_settings WHERE setting_key = ?')->execute([PharmacyModuleConfig::SETTING_KEY]);
            } else {
                $this->db->prepare('UPDATE platform_settings SET setting_value = ? WHERE setting_key = ?')
                    ->execute([$previous, PharmacyModuleConfig::SETTING_KEY]);
            }
        }

        $this->assertStringContainsString('/rendez-vous/nouveau?', $url);
    }

    public function testPrintedPharmacyQrSwitchesOnScanAndAppendsUtmWithQuestionMark(): void
    {
        $pharmacyId = $this->track(PharmacyFixtures::pharmacy($this->db));
        [$qrId, $token] = PharmacyFixtures::qrCode(
            $this->db,
            $pharmacyId,
            'https://cary.test/rendez-vous/nouveau?provider_id=' . $pharmacyId . '&provider_type=pro'
        );

        $resolved = (new QrCodeService($this->db))->resolveToken($token, ['ip' => '203.0.113.7']);

        $this->assertMatchesRegularExpression(
            '#/pharmacie/' . preg_quote($pharmacyId, '#') . '\?utm_qr=' . preg_quote($token, '#') . '$#',
            $resolved['redirect_url']
        );
        $stmt = $this->db->prepare('SELECT redirect_url FROM qr_codes WHERE id = ?');
        $stmt->execute([$qrId]);
        $this->assertStringEndsWith('/pharmacie/' . $pharmacyId, (string) $stmt->fetchColumn());
    }

    public function testBookingQrKeepsAmpersandBeforeUtm(): void
    {
        $proId = $this->track(TestFixtures::insertProfile($this->db, 'pro'));
        [, $token] = PharmacyFixtures::qrCode($this->db, $proId, 'https://cary.test/ancien');

        $resolved = (new QrCodeService($this->db))->resolveToken($token, ['ip' => '203.0.113.8']);

        $this->assertStringContainsString('/rendez-vous/nouveau?provider_id=', $resolved['redirect_url']);
        $this->assertStringEndsWith('&utm_qr=' . $token, $resolved['redirect_url']);
    }

    private function track(string $id): string
    {
        $this->profileIds[] = $id;

        return $id;
    }
}
