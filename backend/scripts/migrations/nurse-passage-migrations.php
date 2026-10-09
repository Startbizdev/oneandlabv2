<?php

declare(strict_types=1);

require_once __DIR__ . '/lab-network-migrations.php';

/**
 * Migrations 118 (créneau all_day des séries de passages), 120 (soin coché : done_at) et 127 (binôme infirmier),
 * idempotentes. Partagées entre les scripts apply-migration-118/120/127 et scripts/deploy-database-safety.php.
 */

function applyMigration118NursePassageSeriesAllDay(PDO $pdo, string $migrationsDir): string
{
    $column = $pdo->query("SHOW COLUMNS FROM nurse_passage_series LIKE 'time_slot'")->fetch(PDO::FETCH_ASSOC);
    if ($column === false) {
        throw new RuntimeException('Colonne nurse_passage_series.time_slot absente : migration 093 requise avant la 118.');
    }
    $type = (string) ($column['Type'] ?? '');
    if (str_contains($type, "'all_day'")) {
        return 'Migration 118 verified: time_slot all_day present.';
    }
    preg_match_all("/'([^']+)'/", $type, $matches);
    $expected = ['morning', 'noon', 'afternoon', 'evening', 'night', 'custom'];
    if ($matches[1] !== $expected) {
        throw new RuntimeException("ENUM time_slot inattendu ({$type}) : migration 118 annulée pour ne perdre aucune valeur.");
    }
    $pdo->exec(readMigrationSql($migrationsDir, '118_nurse_passage_series_all_day.sql'));

    return 'Migration 118 applied: time_slot all_day.';
}

function applyMigration120AppointmentNursingItemsDoneAt(PDO $pdo, string $migrationsDir): string
{
    if ($pdo->query("SHOW TABLES LIKE 'appointment_nursing_items'")->fetch() === false) {
        throw new RuntimeException('Table appointment_nursing_items absente : migration requise avant la 120.');
    }
    $column = $pdo->query("SHOW COLUMNS FROM appointment_nursing_items LIKE 'done_at'")->fetch(PDO::FETCH_ASSOC);
    if ($column !== false) {
        return 'Migration 120 verified: appointment_nursing_items.done_at present.';
    }
    $pdo->exec(readMigrationSql($migrationsDir, '120_appointment_nursing_items_done_at.sql'));

    return 'Migration 120 applied: appointment_nursing_items.done_at.';
}

function applyMigration127NurseCollaborations(PDO $pdo, string $migrationsDir): string
{
    $pdo->exec(readMigrationSql($migrationsDir, '127_nurse_collaborations.sql'));
    $columns = $pdo->query('SHOW COLUMNS FROM nurse_collaborations')->fetchAll(PDO::FETCH_COLUMN);
    $expected = [
        'id', 'owner_nurse_id', 'co_nurse_id', 'scope', 'appointment_id', 'passage_series_id',
        'start_date', 'end_date', 'created_at', 'revoked_at',
    ];
    if ($columns !== $expected) {
        throw new RuntimeException('Schéma nurse_collaborations inattendu : ' . implode(', ', $columns));
    }

    return 'Migration 127 verified: nurse_collaborations present.';
}
