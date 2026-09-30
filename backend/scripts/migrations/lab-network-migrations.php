<?php

declare(strict_types=1);

/**
 * Migrations 116 (lab_brand_labs) et 117 (source lab_assignment), idempotentes.
 * Partagées entre les scripts apply-migration-116/117 et scripts/deploy-database-safety.php.
 */

function readMigrationSql(string $migrationsDir, string $fileName): string
{
    $file = rtrim($migrationsDir, '/\\') . '/' . $fileName;
    $sql = is_readable($file) ? file_get_contents($file) : false;
    if ($sql === false || trim($sql) === '') {
        throw new RuntimeException("Migration {$fileName} introuvable ou illisible.");
    }
    return $sql;
}

function applyMigration116LabBrandLabs(PDO $pdo, string $migrationsDir): string
{
    $pdo->exec(readMigrationSql($migrationsDir, '116_lab_brand_labs.sql'));
    $columns = $pdo->query('SHOW COLUMNS FROM lab_brand_labs')->fetchAll(PDO::FETCH_COLUMN);
    if ($columns !== ['brand_id', 'lab_profile_id', 'created_at']) {
        throw new RuntimeException('Schéma lab_brand_labs inattendu : ' . implode(', ', $columns));
    }
    return 'Migration 116 verified: lab_brand_labs present.';
}

function applyMigration117PpaLabAssignment(PDO $pdo, string $migrationsDir): string
{
    $column = $pdo->query("SHOW COLUMNS FROM patient_professional_access LIKE 'source'")->fetch(PDO::FETCH_ASSOC);
    $type = (string) ($column['Type'] ?? '');
    if (str_contains($type, "'lab_assignment'")) {
        return 'Migration 117 verified: source lab_assignment present.';
    }
    preg_match_all("/'([^']+)'/", $type, $matches);
    $expected = ['created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'qr_origin'];
    if ($matches[1] !== $expected) {
        throw new RuntimeException("ENUM source inattendu ({$type}) : migration 117 annulée pour ne perdre aucune valeur.");
    }
    $pdo->exec(readMigrationSql($migrationsDir, '117_ppa_lab_assignment.sql'));
    return 'Migration 117 applied: source lab_assignment.';
}
