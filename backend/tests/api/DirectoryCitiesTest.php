<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/DirectoryCities.php';
require_once __DIR__ . '/../../lib/CitySlug.php';

/**
 * GET /api/public/directory-cities?kind=nurses|labs — logique métier (DirectoryCities).
 */
final class DirectoryCitiesTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;

    /** @var list<string> */
    private array $profileIds = [];

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->profileIds as $id) {
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        unset($this->db);
        parent::tearDown();
    }

    private function connectDb(): void
    {
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    public function testInvalidKindIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('kind');
        DirectoryCities::normalizeKind('patients');
    }

    public function testMissingKindIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DirectoryCities::normalizeKind(null);
    }

    public function testEmptyListWhenNoPublicNurseCities(): void
    {
        $this->connectDb();
        $this->db->beginTransaction();
        try {
            $this->db->exec("UPDATE profiles SET city_plain = NULL WHERE role = 'nurse'");
            $this->assertSame([], DirectoryCities::list($this->db, DirectoryCities::KIND_NURSES));
        } finally {
            $this->db->rollBack();
        }
    }

    public function testSuccessNursesReturnsDistinctCitiesWithSlugAndCount(): void
    {
        $this->connectDb();
        $suffix = bin2hex(random_bytes(4));
        $city = 'VilleTest' . $suffix;

        $this->insertPublicProfile('nurse', 'dir-nurse-a-' . $suffix, $city);
        $this->insertPublicProfile('nurse', 'dir-nurse-b-' . $suffix, $city);
        $this->insertPublicProfile('nurse', 'dir-nurse-c-' . $suffix, null);
        $this->insertPublicProfile('lab', 'dir-lab-noise-' . $suffix, $city);

        $data = DirectoryCities::list($this->db, DirectoryCities::KIND_NURSES);
        $byCity = [];
        foreach ($data as $row) {
            $byCity[$row['city']] = $row;
        }

        $this->assertArrayHasKey($city, $byCity);
        $this->assertSame([
            'city' => $city,
            'slug' => CitySlug::from($city),
            'count' => 2,
        ], $byCity[$city]);

        $cities = array_column($data, 'city');
        $sorted = $cities;
        sort($sorted, SORT_STRING);
        $this->assertSame($sorted, $cities);
    }

    public function testSuccessLabsIncludesLabAndSubaccount(): void
    {
        $this->connectDb();
        $suffix = bin2hex(random_bytes(4));
        $city = 'LaboVille' . $suffix;

        $this->insertPublicProfile('lab', 'dir-lab-' . $suffix, $city);
        $this->insertPublicProfile('subaccount', 'dir-sub-' . $suffix, $city, TestFixtures::LAB);
        $this->insertPublicProfile('nurse', 'dir-nurse-noise-' . $suffix, $city);

        $data = DirectoryCities::list($this->db, DirectoryCities::KIND_LABS);
        $byCity = [];
        foreach ($data as $row) {
            $byCity[$row['city']] = $row;
        }

        $this->assertArrayHasKey($city, $byCity);
        $this->assertSame(2, $byCity[$city]['count']);
        $this->assertSame(CitySlug::from($city), $byCity[$city]['slug']);
    }

    public function testCityFilterClauseAcceptsSlugAndRawName(): void
    {
        $this->connectDb();
        $suffix = bin2hex(random_bytes(4));
        $city = 'Saint-Test' . $suffix;
        $this->insertPublicProfile('nurse', 'dir-filter-' . $suffix, $city);

        $baseWhere = DirectoryCities::roleCondition(DirectoryCities::KIND_NURSES)
            . ' AND ' . DirectoryCities::publicProfileCondition();

        $bySlug = DirectoryCities::cityFilterClause($this->db, $baseWhere, [], CitySlug::from($city));
        $this->assertStringContainsString('IN (', $bySlug['clause']);
        $this->assertContains($city, $bySlug['params']);

        $byName = DirectoryCities::cityFilterClause($this->db, $baseWhere, [], $city);
        $this->assertContains($city, $byName['params']);

        $miss = DirectoryCities::cityFilterClause($this->db, $baseWhere, [], 'ville-absente-' . $suffix);
        $this->assertSame(' AND 1=0', $miss['clause']);
        $this->assertSame([], $miss['params']);
    }

    private function insertPublicProfile(string $role, string $slug, ?string $city, ?string $labId = null): string
    {
        $id = TestFixtures::insertProfile($this->db, $role, $labId);
        $this->profileIds[] = $id;
        $this->db->prepare('
            UPDATE profiles
            SET is_public_profile_enabled = 1,
                public_slug = ?,
                city_plain = ?
            WHERE id = ?
        ')->execute([$slug, $city, $id]);

        return $id;
    }
}
