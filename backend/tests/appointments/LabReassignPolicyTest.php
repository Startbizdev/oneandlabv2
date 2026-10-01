<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/appointments/LabReassignPolicy.php';

/**
 * Réassignation labo : seulement une prise de sang déjà attribuée à l'équipe ; un RDV sans labo passe par les offres.
 */
final class LabReassignPolicyTest extends TestCase
{
    use SkipsWithoutPdo;

    private const LAB_USER = ['user_id' => TestFixtures::LAB, 'role' => 'lab'];

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

    public function testAppointmentWithoutLabMustGoThroughOffers(): void
    {
        $denied = $this->deny(self::LAB_USER, ['type' => 'blood_test', 'assigned_lab_id' => null], TestFixtures::PRELEVEUR);

        $this->assertSame(403, $denied->httpStatus);
        $this->assertSame('NOT_ASSIGNED_TO_TEAM', $denied->errorCode);
    }

    public function testAppointmentOfAnotherLabIsRefused(): void
    {
        $otherLab = $this->profile('lab');

        $denied = $this->deny(self::LAB_USER, ['type' => 'blood_test', 'assigned_lab_id' => $otherLab], null);

        $this->assertSame('NOT_ASSIGNED_TO_TEAM', $denied->errorCode);
    }

    public function testNursingAppointmentIsRefused(): void
    {
        $denied = $this->deny(self::LAB_USER, ['type' => 'nursing', 'assigned_lab_id' => TestFixtures::LAB], null);

        $this->assertSame('FORBIDDEN', $denied->errorCode);
    }

    public function testPreleveurOutsideTheTeamIsRefused(): void
    {
        $otherLab = $this->profile('lab');
        $foreign = $this->profile('preleveur', $otherLab);

        $denied = $this->deny(self::LAB_USER, ['type' => 'blood_test', 'assigned_lab_id' => TestFixtures::LAB], $foreign);

        $this->assertSame('FORBIDDEN', $denied->errorCode);
    }

    public function testTeamAppointmentCanBeGivenToATeamPreleveur(): void
    {
        $this->expectNotToPerformAssertions();

        LabReassignPolicy::assertCanReassign($this->db, self::LAB_USER, ['type' => 'blood_test', 'assigned_lab_id' => TestFixtures::LAB], TestFixtures::PRELEVEUR);
        LabReassignPolicy::assertCanReassign(
            $this->db,
            ['user_id' => TestFixtures::SUBACCOUNT, 'role' => 'subaccount'],
            ['type' => 'blood_test', 'assigned_lab_id' => TestFixtures::LAB],
            TestFixtures::PRELEVEUR
        );
    }

    public function testSiblingsOutsideTheTeamAreSkipped(): void
    {
        $otherLab = $this->profile('lab');

        $this->assertTrue(LabReassignPolicy::canReassignSibling($this->db, self::LAB_USER, TestFixtures::SUBACCOUNT));
        $this->assertFalse(LabReassignPolicy::canReassignSibling($this->db, self::LAB_USER, null));
        $this->assertFalse(LabReassignPolicy::canReassignSibling($this->db, self::LAB_USER, $otherLab));
        $this->assertTrue(LabReassignPolicy::canReassignSibling($this->db, ['user_id' => TestFixtures::ADMIN, 'role' => 'super_admin'], null));
    }

    /**
     * @param array<string, string> $user
     * @param array<string, mixed> $appointment
     */
    private function deny(array $user, array $appointment, ?string $assignedTo): HttpStatusException
    {
        try {
            LabReassignPolicy::assertCanReassign($this->db, $user, $appointment, $assignedTo);
        } catch (HttpStatusException $e) {
            return $e;
        }
        $this->fail('Refus attendu');
    }

    private function profile(string $role, ?string $labId = null): string
    {
        $id = TestFixtures::insertProfile($this->db, $role, $labId);
        $this->profileIds[] = $id;

        return $id;
    }
}
