<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../scripts/migrations/patient-record-migrations.php';

use PHPUnit\Framework\TestCase;

/**
 * Migrations 119/121/122/126 rejouées à chaque déploiement : sans effet sur un schéma déjà migré.
 */
final class PatientRecordMigrationsTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $migrationsDir;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->migrationsDir = dirname(__DIR__, 3) . '/database/migrations';
    }

    protected function tearDown(): void
    {
        unset($this->db);
        parent::tearDown();
    }

    public function testReplayOnMigratedSchemaIsIdempotent(): void
    {
        $absencesBefore = $this->db->query('SELECT COUNT(*) FROM patient_absences')->fetchColumn();

        $this->assertSame(
            'Migration 119 verified: patient_absences.end_date nullable.',
            applyMigration119PatientAbsencesOpenEnd($this->db, $this->migrationsDir)
        );
        $this->assertSame(
            'Migration 121 verified: patient_phones present.',
            applyMigration121PatientPhones($this->db, $this->migrationsDir)
        );
        $this->assertSame(
            'Migration 121 verified: patient_phones present.',
            applyMigration121PatientPhones($this->db, $this->migrationsDir)
        );
        $this->assertSame(
            'Migration 122 verified: patient_transmissions present.',
            applyMigration122PatientTransmissions($this->db, $this->migrationsDir)
        );
        $relativesBefore = $this->db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn();
        $this->assertSame(
            'Migration 126 verified: patient_relatives.profile_id present.',
            applyMigration126PatientRelativesProfile($this->db, $this->migrationsDir)
        );
        $this->assertSame(
            'Migration 128 verified: medical_documents.replaced_* present.',
            applyMigration128MedicalDocumentsReplacement($this->db, $this->migrationsDir)
        );
        $this->assertSame($absencesBefore, $this->db->query('SELECT COUNT(*) FROM patient_absences')->fetchColumn());
        $this->assertSame($relativesBefore, $this->db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn());
    }

    public function testMissingMigrationFileStopsDeployment(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('121_patient_phones.sql introuvable');

        applyMigration121PatientPhones($this->db, sys_get_temp_dir() . '/no-migrations-' . bin2hex(random_bytes(4)));
    }
}
