<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/users/PatientProfessionalAccessService.php';

use PHPUnit\Framework\TestCase;

/**
 * Les origines de lien patient ↔ professionnel écrites par le code doivent exister dans l'ENUM en base.
 */
final class PatientAccessSourcesTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private ?string $nurseId = null;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        if ($this->nurseId !== null) {
            $this->db->prepare('DELETE FROM patient_professional_access WHERE professional_id = ?')->execute([$this->nurseId]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->nurseId]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testEveryLinkSourceExistsInDatabaseEnum(): void
    {
        $type = (string) $this->db->query("SHOW COLUMNS FROM patient_professional_access LIKE 'source'")->fetch(PDO::FETCH_ASSOC)['Type'];
        preg_match_all("/'([^']+)'/", $type, $m);

        foreach (PatientProfessionalAccessService::LINK_SOURCES as $source) {
            $this->assertContains($source, $m[1], "Origine « {$source} » absente de l'ENUM ({$type})");
        }
    }

    public function testUnknownSourceIsStoredAsCreated(): void
    {
        $this->nurseId = TestFixtures::insertProfile($this->db, 'nurse');

        (new PatientProfessionalAccessService($this->db))
            ->linkPatientProfessional(TestFixtures::PATIENT_A, $this->nurseId, null, 'qr_booking');

        $stmt = $this->db->prepare('SELECT source FROM patient_professional_access WHERE patient_id = ? AND professional_id = ?');
        $stmt->execute([TestFixtures::PATIENT_A, $this->nurseId]);
        $this->assertSame('created', $stmt->fetchColumn());
    }
}
