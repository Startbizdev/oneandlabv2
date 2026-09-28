<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../models/User.php';

use PHPUnit\Framework\TestCase;

/**
 * Caractérisation User : PDO injectable + fixtures Docker.
 */
final class UserDirectoryTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $pdo;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN requis');
        }
        $this->pdo = TestDatabase::pdo();
    }

    public function testFixtureProfilesExistByRole(): void
    {
        $stmt = $this->pdo->query('SELECT role, COUNT(*) AS n FROM profiles GROUP BY role');
        $byRole = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $byRole[(string) $row['role']] = (int) $row['n'];
        }
        $this->assertGreaterThanOrEqual(1, $byRole['patient'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $byRole['nurse'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $byRole['lab'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $byRole['super_admin'] ?? 0);
    }

    public function testUserAcceptsInjectedPdoAndLoadsPatient(): void
    {
        $user = new User($this->pdo);
        $profile = $user->getById(TestFixtures::PATIENT_A, TestFixtures::ADMIN, 'super_admin');
        $this->assertIsArray($profile);
        $this->assertSame(TestFixtures::PATIENT_A, $profile['id'] ?? null);
        $this->assertSame('patient', $profile['role'] ?? null);
        $this->assertSame('Alice', $profile['first_name'] ?? null);
    }

    public function testPickerScopeReturnsCompactRows(): void
    {
        $user = new User($this->pdo);
        $result = $user->getAll(
            ['scope' => 'picker', 'role' => 'patient'],
            1,
            10,
            TestFixtures::ADMIN,
            'super_admin'
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('data', $result);
        $list = $result['data'];
        $this->assertNotEmpty($list);
        $row = $list[0];
        $this->assertArrayHasKey('id', $row);
        $this->assertArrayHasKey('first_name', $row);
        $this->assertArrayNotHasKey('profile_image_url', $row);
    }
}
