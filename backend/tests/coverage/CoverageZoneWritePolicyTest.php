<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/CoverageZoneWritePolicy.php';

/**
 * Zones de couverture : rôle de zone pris du profil propriétaire (jamais du corps), propriétaire contrôlé,
 * rayon plafonné selon l'abonnement.
 */
final class CoverageZoneWritePolicyTest extends TestCase
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
        foreach (array_reverse($this->profileIds) as $id) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testRoleComesFromOwnerProfileNotFromBody(): void
    {
        $resolved = CoverageZoneWritePolicy::resolveOwnerAndRole(
            $this->db,
            ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'],
            ['role' => 'lab']
        );

        $this->assertSame(['owner_id' => TestFixtures::NURSE, 'role' => 'nurse'], $resolved);
        $this->assertSame(20.0, CoverageZoneWritePolicy::maxHalfSideKm($this->db, $resolved['role'], $resolved['owner_id']));
    }

    public function testPatientCannotWriteAZone(): void
    {
        $this->assertForbidden(['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'], []);
    }

    public function testNurseCannotWriteAnotherOwnersZone(): void
    {
        $this->assertForbidden(['user_id' => TestFixtures::NURSE, 'role' => 'nurse'], ['owner_id' => TestFixtures::LAB]);
    }

    public function testLabWritesForItsSubaccountOnly(): void
    {
        $resolved = CoverageZoneWritePolicy::resolveOwnerAndRole(
            $this->db,
            ['user_id' => TestFixtures::LAB, 'role' => 'lab'],
            ['owner_id' => TestFixtures::SUBACCOUNT, 'role' => 'nurse']
        );
        $this->assertSame(['owner_id' => TestFixtures::SUBACCOUNT, 'role' => 'subaccount'], $resolved);
        $this->assertSame(100.0, CoverageZoneWritePolicy::maxHalfSideKm($this->db, $resolved['role'], $resolved['owner_id']));

        $otherLab = TestFixtures::insertProfile($this->db, 'lab');
        $this->profileIds[] = $otherLab;
        $foreignSub = TestFixtures::insertProfile($this->db, 'subaccount', $otherLab);
        $this->profileIds[] = $foreignSub;
        $this->assertForbidden(['user_id' => TestFixtures::LAB, 'role' => 'lab'], ['owner_id' => $foreignSub]);
    }

    public function testAdminCannotGiveAZoneToANonZoneRole(): void
    {
        $this->assertForbidden(['user_id' => TestFixtures::ADMIN, 'role' => 'super_admin'], ['owner_id' => TestFixtures::PATIENT_A]);
    }

    public function testReadDefaultsToOwnZoneAndAnotherOwnerIsRefused(): void
    {
        $this->assertSame(
            TestFixtures::NURSE,
            CoverageZoneWritePolicy::resolveReadableOwnerId($this->db, ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'], null)
        );
        $this->assertSame(
            TestFixtures::NURSE,
            CoverageZoneWritePolicy::resolveReadableOwnerId($this->db, ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'], TestFixtures::NURSE)
        );

        foreach ([
            ['user_id' => TestFixtures::NURSE, 'role' => 'nurse'],
            ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'],
            ['user_id' => TestFixtures::PRO, 'role' => 'pro'],
            ['user_id' => TestFixtures::SUBACCOUNT, 'role' => 'subaccount'],
        ] as $user) {
            $this->assertReadForbidden($user, TestFixtures::LAB);
        }
        $this->assertReadForbidden(['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'], TestFixtures::NURSE);
        $this->assertReadForbidden(['user_id' => '', 'role' => 'nurse'], null);
    }

    public function testLabReadsItsAccountsOnlyAndAdminReadsAll(): void
    {
        $lab = ['user_id' => TestFixtures::LAB, 'role' => 'lab'];
        $this->assertSame(TestFixtures::SUBACCOUNT, CoverageZoneWritePolicy::resolveReadableOwnerId($this->db, $lab, TestFixtures::SUBACCOUNT));
        $this->assertReadForbidden($lab, TestFixtures::NURSE);

        $otherLab = TestFixtures::insertProfile($this->db, 'lab');
        $this->profileIds[] = $otherLab;
        $foreignSub = TestFixtures::insertProfile($this->db, 'subaccount', $otherLab);
        $this->profileIds[] = $foreignSub;
        $this->assertReadForbidden($lab, $foreignSub);
        $this->assertReadForbidden($lab, $otherLab);

        $this->assertSame(
            $foreignSub,
            CoverageZoneWritePolicy::resolveReadableOwnerId($this->db, ['user_id' => TestFixtures::ADMIN, 'role' => 'super_admin'], $foreignSub)
        );
    }

    /** @param array<string, string> $user */
    private function assertReadForbidden(array $user, ?string $ownerId): void
    {
        try {
            CoverageZoneWritePolicy::resolveReadableOwnerId($this->db, $user, $ownerId);
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
            return;
        }
        $this->fail('Refus 403 attendu');
    }

    /**
     * @param array<string, string> $user
     * @param array<string, string> $input
     */
    private function assertForbidden(array $user, array $input): void
    {
        try {
            CoverageZoneWritePolicy::resolveOwnerAndRole($this->db, $user, $input);
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
            return;
        }
        $this->fail('Refus 403 attendu');
    }
}
