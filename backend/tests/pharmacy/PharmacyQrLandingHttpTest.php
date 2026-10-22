<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/PharmacyFixtures.php';
require_once __DIR__ . '/../support/HttpHarness.php';

/**
 * Arrivée du QR pharmacie : fiche publique minimale et présélection d'une pharmacie hors code postal.
 */
final class PharmacyQrLandingHttpTest extends TestCase
{
    private PDO $db;
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
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

    public function testPublicPharmacyExposesOnlyTheLandingFields(): void
    {
        $id = $this->track(PharmacyFixtures::pharmacy(
            $this->db,
            'Pharmacie du Port',
            ['formatted_address' => '1 quai du Port, 13002 Marseille', 'postal_code' => '13002', 'city' => 'Marseille'],
        ));

        $res = HttpHarness::request('GET', '/api/public/pharmacy?id=' . $id);

        $this->assertSame(200, $res['status'], $res['raw']);
        $this->assertSame([
            'id' => $id,
            'name' => 'Pharmacie du Port',
            'city' => 'Marseille',
            'orders_open' => true,
            'accepts_click_collect' => true,
            'accepts_home_delivery' => false,
        ], $res['json']['data'] ?? null);
        $this->assertStringNotContainsString('@', $res['raw']);
    }

    public function testPausedPharmacyIsShownWithOrdersClosed(): void
    {
        $id = $this->track(PharmacyFixtures::pharmacy($this->db, null, null, true));

        $res = HttpHarness::request('GET', '/api/public/pharmacy?id=' . $id);

        $this->assertSame(200, $res['status'], $res['raw']);
        $this->assertFalse($res['json']['data']['orders_open']);
        $this->assertNull($res['json']['data']['city']);
        $this->assertSame('Profil Test', $res['json']['data']['name']);
    }

    public function testNonPharmacyUnknownOrInvalidIdIsNotFound(): void
    {
        $proId = $this->track(TestFixtures::insertProfile($this->db, 'pro'));

        foreach ([$proId, TestFixtures::PATIENT_A, '00000000-0000-4000-8000-0000000fffff', 'pas-un-uuid'] as $id) {
            $res = HttpHarness::request('GET', '/api/public/pharmacy?id=' . rawurlencode($id));
            $this->assertSame(404, $res['status'], $id);
            $this->assertSame(['success' => false, 'error' => 'Pharmacie introuvable'], $res['json']);
        }
    }

    public function testIncludeIdKeepsAPharmacyOutsideThePostalArea(): void
    {
        $id = $this->track(PharmacyFixtures::pharmacy(
            $this->db,
            'Pharmacie de Paris',
            ['formatted_address' => '1 rue de Rivoli, 75001 Paris', 'postal_code' => '75001', 'city' => 'Paris'],
        ));
        $token = HttpHarness::token(TestFixtures::PATIENT_A, 'patient');

        $filtered = HttpHarness::request('GET', '/api/pharmacies?postal_code=13001', $token);
        $included = HttpHarness::request('GET', '/api/pharmacies?postal_code=13001&include_id=' . $id, $token);

        $this->assertSame(200, $filtered['status'], $filtered['raw']);
        $this->assertNotContains($id, array_column($filtered['json']['data'], 'id'));
        $this->assertSame(200, $included['status'], $included['raw']);
        $this->assertContains($id, array_column($included['json']['data'], 'id'));
    }

    public function testIncludeIdNeverAddsAPausedPharmacy(): void
    {
        $id = $this->track(PharmacyFixtures::pharmacy($this->db, null, ['postal_code' => '75001'], true));
        $token = HttpHarness::token(TestFixtures::PATIENT_A, 'patient');

        $res = HttpHarness::request('GET', '/api/pharmacies?postal_code=13001&include_id=' . $id, $token);

        $this->assertSame(200, $res['status'], $res['raw']);
        $this->assertNotContains($id, array_column($res['json']['data'], 'id'));
    }

    public function testPharmacyDetailIsReadableByAPatient(): void
    {
        $id = $this->track(PharmacyFixtures::pharmacy($this->db, 'Pharmacie Lointaine', ['postal_code' => '69001']));

        $res = HttpHarness::request('GET', '/api/pharmacies/' . $id, HttpHarness::token(TestFixtures::PATIENT_A, 'patient'));

        $this->assertSame(200, $res['status'], $res['raw']);
        $this->assertSame('Pharmacie Lointaine', $res['json']['data']['display_name']);
    }

    private function track(string $id): string
    {
        $this->profileIds[] = $id;

        return $id;
    }
}
