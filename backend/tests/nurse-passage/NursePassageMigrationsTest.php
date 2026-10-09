<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../scripts/migrations/nurse-passage-migrations.php';

use PHPUnit\Framework\TestCase;

/**
 * Migrations 118/120/127 rejouées à chaque déploiement : sans effet sur un schéma déjà migré, bloquantes si le fichier manque.
 */
final class NursePassageMigrationsTest extends TestCase
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

    public function testReplayOnMigratedSchemaIsANoOp(): void
    {
        $this->assertSame(
            'Migration 118 verified: time_slot all_day present.',
            applyMigration118NursePassageSeriesAllDay($this->db, $this->migrationsDir),
        );
        $this->assertSame(
            'Migration 120 verified: appointment_nursing_items.done_at present.',
            applyMigration120AppointmentNursingItemsDoneAt($this->db, $this->migrationsDir),
        );
        $this->assertSame(
            'Migration 127 verified: nurse_collaborations present.',
            applyMigration127NurseCollaborations($this->db, $this->migrationsDir),
        );
        $column = $this->db->query("SHOW COLUMNS FROM nurse_passage_series LIKE 'time_slot'")->fetch(PDO::FETCH_ASSOC);
        $this->assertStringContainsString("'all_day'", (string) $column['Type']);
        $this->assertSame('morning', $column['Default']);
    }

    public function testMissingMigrationFileStopsDeployment(): void
    {
        $this->db->exec('ALTER TABLE appointment_nursing_items DROP COLUMN done_at');
        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('120_appointment_nursing_items_done_at.sql introuvable');
            applyMigration120AppointmentNursingItemsDoneAt($this->db, sys_get_temp_dir() . '/no-migrations-' . bin2hex(random_bytes(4)));
        } finally {
            applyMigration120AppointmentNursingItemsDoneAt($this->db, $this->migrationsDir);
        }
    }
}
