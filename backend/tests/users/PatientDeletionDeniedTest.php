<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * DELETE /patients/{id} : chaque refus porte son statut HTTP et son code (plus de détection par texte).
 */
final class PatientDeletionDeniedTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $userModel;
    private string $patientId;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->userModel = new User($this->db);
        $this->patientId = TestFixtures::insertProfile($this->db, 'patient');
        $this->db->prepare('UPDATE profiles SET created_by = ? WHERE id = ?')->execute([TestFixtures::PRO, $this->patientId]);
    }

    protected function tearDown(): void
    {
        if (isset($this->patientId)) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->patientId]);
        }
        parent::tearDown();
    }

    /** @return iterable<string, array{string, string, string, int, string}> */
    public static function refusalProvider(): iterable
    {
        yield 'rôle non autorisé' => ['patient', TestFixtures::PATIENT_B, 'Accès refusé', 403, 'FORBIDDEN'];
        yield 'patient d’un autre professionnel' => ['nurse', TestFixtures::NURSE, 'Vous ne pouvez supprimer que les patients que vous avez créés', 403, 'FORBIDDEN'];
    }

    /** @dataProvider refusalProvider */
    public function testRefusalCarriesStatusAndCode(string $role, string $actorId, string $message, int $status, string $code): void
    {
        $denied = $this->deny($this->patientId, $actorId, $role);

        $this->assertSame($message, $denied->getMessage());
        $this->assertSame($status, $denied->httpStatus);
        $this->assertSame($code, $denied->errorCode);
        $this->assertTrue($this->exists($this->patientId));
    }

    public function testUnknownPatientIsNotFound(): void
    {
        $denied = $this->deny('00000000-0000-4000-8000-0000000fffff', TestFixtures::PRO, 'pro');

        $this->assertSame(404, $denied->httpStatus);
        $this->assertSame('NOT_FOUND', $denied->errorCode);
    }

    public function testNonPatientAccountIsRejected(): void
    {
        $denied = $this->deny(TestFixtures::NURSE, TestFixtures::ADMIN, 'super_admin');

        $this->assertSame(400, $denied->httpStatus);
        $this->assertSame('NOT_A_PATIENT', $denied->errorCode);
        $this->assertTrue($this->exists(TestFixtures::NURSE));
    }

    public function testCreatorDeletesOwnPatient(): void
    {
        $this->assertTrue($this->userModel->deletePatientCreatedBy($this->patientId, TestFixtures::PRO, 'pro'));
        $this->assertFalse($this->exists($this->patientId));
    }

    private function deny(string $patientId, string $actorId, string $role): PatientDeletionDenied
    {
        try {
            $this->userModel->deletePatientCreatedBy($patientId, $actorId, $role);
        } catch (PatientDeletionDenied $e) {
            return $e;
        }
        $this->fail('PatientDeletionDenied attendue');
    }

    private function exists(string $id): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM profiles WHERE id = ?');
        $stmt->execute([$id]);

        return $stmt->fetchColumn() !== false;
    }
}
