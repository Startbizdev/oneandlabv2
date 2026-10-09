<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../models/LabBrand.php';

use PHPUnit\Framework\TestCase;

/**
 * Administration des marques labo : validation, ordre, RDV liés et labos réellement joignables.
 */
final class LabBrandAdminTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private LabBrand $brands;
    /** @var list<string> */
    private array $brandIds = [];
    /** @var list<string> */
    private array $profileIds = [];
    /** @var list<string> */
    private array $appointmentIds = [];
    /** @var array<string, int> */
    private array $originalOrder = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->brands = new LabBrand($this->db);
        $this->originalOrder = array_map('intval', $this->db->query('SELECT id, sort_order FROM lab_brands')->fetchAll(PDO::FETCH_KEY_PAIR));
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->appointmentIds as $id) {
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
            }
            foreach ($this->brandIds as $id) {
                $this->db->prepare('DELETE FROM lab_brands WHERE id = ?')->execute([$id]);
            }
            foreach ($this->profileIds as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
            $restore = $this->db->prepare('UPDATE lab_brands SET sort_order = ? WHERE id = ?');
            foreach ($this->originalOrder as $id => $order) {
                $restore->execute([$order, $id]);
            }
        }
        unset($this->brands, $this->db);
        parent::tearDown();
    }

    public function testUpdateWithoutNameKeepsExistingValues(): void
    {
        $brand = $this->createBrand('Réseau Conservé', ['website_url' => 'https://reseau.example']);

        $updated = $this->brands->update($brand['id'], ['is_active' => 0]);

        $this->assertSame('Réseau Conservé', $updated['name']);
        $this->assertSame('https://reseau.example', $updated['website_url']);
        $this->assertSame(0, (int) $updated['is_active']);
    }

    public function testDuplicateNameIsRejectedWithClearMessage(): void
    {
        $this->createBrand('Réseau Double');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('La marque « Réseau Double » porte déjà ce nom.');
        $this->createBrand('Reseau double');
    }

    public function testOnlyHttpUrlsAreAccepted(): void
    {
        $brand = $this->createBrand('Réseau Logo', ['logo_url' => 'https://cdn.example/logo.png']);
        $this->assertSame('https://cdn.example/logo.png', $brand['logo_url']);

        foreach (['javascript:alert(1)', 'ftp://cdn.example/logo.png', 'logo.png'] as $invalid) {
            try {
                $this->brands->update($brand['id'], ['logo_url' => $invalid]);
                $this->fail("URL acceptée à tort : {$invalid}");
            } catch (InvalidArgumentException $e) {
                $this->assertStringContainsString('https://', $e->getMessage());
            }
        }
        $this->assertSame('https://cdn.example/logo.png', $this->brands->getById($brand['id'])['logo_url']);
    }

    public function testReorderRequiresEveryBrandAndPersistsPositions(): void
    {
        $this->createBrand('Réseau Ordre');
        $ids = array_column($this->brands->listAll(), 'id');
        $reversed = array_reverse($ids);

        $this->brands->reorder($reversed);

        $this->assertSame($reversed, array_column($this->brands->listAll(), 'id'));
        $this->expectException(InvalidArgumentException::class);
        $this->brands->reorder(array_slice($reversed, 1));
    }

    public function testListAllCountsAppointmentsThatChoseTheBrand(): void
    {
        $brand = $this->createBrand('Réseau Compté');
        $this->insertBrandAppointment($brand['id']);
        $this->insertBrandAppointment($brand['id']);

        $row = $this->findListed($brand['id']);

        $this->assertSame(2, $row['appointment_count']);
    }

    public function testLabReachabilityMatchesDispatchConditions(): void
    {
        $reachable = $this->insertLab(true, true);
        $withoutZone = $this->insertLab(true, false);
        $notAccepting = $this->insertLab(false, true);
        $inactiveZone = $this->insertLab(true, true);
        $this->db->prepare('UPDATE coverage_zones SET is_active = 0 WHERE owner_id = ?')->execute([$inactiveZone]);

        $byId = array_column($this->brands->listLabReachability(), null, 'id');

        $this->assertSame(['id' => $reachable, 'has_active_zone' => true, 'is_accepting_appointments' => true], $byId[$reachable]);
        $this->assertFalse($byId[$withoutZone]['has_active_zone']);
        $this->assertFalse($byId[$notAccepting]['is_accepting_appointments']);
        $this->assertFalse($byId[$inactiveZone]['has_active_zone']);
    }

    /** @param array<string, mixed> $extra */
    private function createBrand(string $name, array $extra = []): array
    {
        $brand = $this->brands->create(['name' => $name, 'is_active' => 1] + $extra);
        $this->brandIds[] = (string) $brand['id'];
        return $brand;
    }

    /** @return array<string, mixed> */
    private function findListed(string $brandId): array
    {
        foreach ($this->brands->listAll() as $row) {
            if ($row['id'] === $brandId) {
                return $row;
            }
        }
        $this->fail('Marque absente de la liste');
    }

    private function insertLab(bool $accepting, bool $withZone): string
    {
        $id = TestFixtures::insertProfile($this->db, 'lab');
        $this->profileIds[] = $id;
        $this->db->prepare('UPDATE profiles SET is_accepting_appointments = ? WHERE id = ?')->execute([$accepting ? 1 : 0, $id]);
        if ($withZone) {
            $this->db->prepare('
                INSERT INTO coverage_zones (id, owner_id, role, zone_type, center_lat, center_lng, radius_km, is_active)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)
            ')->execute([$id, 'lab', 'circle', 43.3, 5.37, 10]);
        }
        return $id;
    }

    private function insertBrandAppointment(string $brandId): void
    {
        $id = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $address = (new Crypto())->encryptField((string) json_encode(['lat' => 43.3, 'lng' => 5.37]));
        $this->db->prepare('
            INSERT INTO appointments (id, type, status, patient_id, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, lab_preference_mode, preferred_lab_brand_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, 'blood_test', 'pending', TestFixtures::PATIENT_A, TestFixtures::PATIENT_A, 'patient', 'blood_test',
            43.3, 5.37, $address['encrypted'], $address['dek'], (new DateTimeImmutable('+3 days'))->format('Y-m-d 10:00:00'),
            'brand_choice', $brandId,
        ]);
        $this->appointmentIds[] = $id;
    }
}
