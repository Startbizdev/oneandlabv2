<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/users/ProfileLabAssignmentPolicy.php';

use PHPUnit\Framework\TestCase;

/**
 * Rattachement labo d'un profil : réservé à l'admin et au labo propriétaire, uniquement pour préleveurs et sous-comptes.
 */
final class ProfileLabAssignmentPolicyTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $users;
    private ?string $otherLabId = null;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->users = new User($this->db);
    }

    protected function tearDown(): void
    {
        if ($this->otherLabId !== null) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->otherLabId]);
        }
        parent::tearDown();
    }

    public function testPreleveurCannotMoveItselfToAnotherLab(): void
    {
        $this->assertDenied(TestFixtures::PRELEVEUR, 'preleveur', TestFixtures::PRELEVEUR, $this->otherLab(), 403);
    }

    public function testStaffEditingAPatientCannotSetItsLab(): void
    {
        foreach (['nurse' => TestFixtures::NURSE, 'pro' => TestFixtures::PRO, 'subaccount' => TestFixtures::SUBACCOUNT] as $role => $requesterId) {
            $this->assertDenied($requesterId, $role, TestFixtures::PATIENT_A, TestFixtures::LAB, 403);
        }
    }

    public function testLabCannotSetLabOnAPatient(): void
    {
        $this->assertDenied(TestFixtures::LAB, 'lab', TestFixtures::PATIENT_A, TestFixtures::LAB, 400);
    }

    public function testLabAssignsItsPreleveurToItselfOrItsSubaccount(): void
    {
        ProfileLabAssignmentPolicy::assertCanAssign($this->users, TestFixtures::LAB, 'lab', TestFixtures::PRELEVEUR, TestFixtures::LAB);
        ProfileLabAssignmentPolicy::assertCanAssign($this->users, TestFixtures::LAB, 'lab', TestFixtures::PRELEVEUR, TestFixtures::SUBACCOUNT);
        ProfileLabAssignmentPolicy::assertCanAssign($this->users, TestFixtures::LAB, 'lab', TestFixtures::PRELEVEUR, null);
        $this->addToAssertionCount(3);
    }

    public function testLabCannotAssignToAnotherLabOrNestASubaccount(): void
    {
        $this->assertDenied(TestFixtures::LAB, 'lab', TestFixtures::PRELEVEUR, $this->otherLab(), 400);
        $this->assertDenied(TestFixtures::LAB, 'lab', TestFixtures::SUBACCOUNT, TestFixtures::SUBACCOUNT, 400);
    }

    public function testAdminAssignsToAnyLabButNotToANonLabProfile(): void
    {
        ProfileLabAssignmentPolicy::assertCanAssign($this->users, TestFixtures::ADMIN, 'super_admin', TestFixtures::PRELEVEUR, $this->otherLab());
        ProfileLabAssignmentPolicy::assertCanAssign($this->users, TestFixtures::ADMIN, 'super_admin', TestFixtures::SUBACCOUNT, TestFixtures::LAB);
        $this->addToAssertionCount(2);
        $this->assertDenied(TestFixtures::ADMIN, 'super_admin', TestFixtures::PRELEVEUR, TestFixtures::NURSE, 400);
        $this->assertDenied(TestFixtures::ADMIN, 'super_admin', TestFixtures::SUBACCOUNT, TestFixtures::SUBACCOUNT, 400);
    }

    private function assertDenied(string $requesterId, string $requesterRole, string $targetId, ?string $newLabId, int $status): void
    {
        try {
            ProfileLabAssignmentPolicy::assertCanAssign($this->users, $requesterId, $requesterRole, $targetId, $newLabId);
            $this->fail("{$requesterRole} ne devrait pas pouvoir rattacher {$targetId} à {$newLabId}");
        } catch (ProfileLabAssignmentDenied $e) {
            $this->assertSame($status, $e->httpStatus);
        }
    }

    private function otherLab(): string
    {
        return $this->otherLabId ??= TestFixtures::insertProfile($this->db, 'lab');
    }
}
