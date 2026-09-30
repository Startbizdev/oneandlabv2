<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../scripts/migrations/lab-network-migrations.php';

use PHPUnit\Framework\TestCase;

/**
 * Migrations 116/117 rejouées à chaque déploiement : sans effet sur un schéma déjà migré, bloquantes si le fichier manque.
 */
final class LabNetworkMigrationsTest extends TestCase
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

    public function testReplayOnMigratedSchemaKeepsExistingAccessRows(): void
    {
        $before = $this->db->query('SELECT COUNT(*) FROM patient_professional_access')->fetchColumn();

        $this->assertSame('Migration 116 verified: lab_brand_labs present.', applyMigration116LabBrandLabs($this->db, $this->migrationsDir));
        $this->assertSame('Migration 117 verified: source lab_assignment present.', applyMigration117PpaLabAssignment($this->db, $this->migrationsDir));
        $this->assertSame('Migration 116 verified: lab_brand_labs present.', applyMigration116LabBrandLabs($this->db, $this->migrationsDir));

        $this->assertSame($before, $this->db->query('SELECT COUNT(*) FROM patient_professional_access')->fetchColumn());
    }

    public function testMissingMigrationFileStopsDeployment(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('116_lab_brand_labs.sql introuvable');

        applyMigration116LabBrandLabs($this->db, sys_get_temp_dir() . '/no-migrations-' . bin2hex(random_bytes(4)));
    }
}
