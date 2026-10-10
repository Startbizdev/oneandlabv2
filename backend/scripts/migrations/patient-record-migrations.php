<?php

declare(strict_types=1);

require_once __DIR__ . '/lab-network-migrations.php';

/**
 * Migrations 119 (absence sans date de fin), 121 (téléphones patient), 122 (transmissions),
 * 126 (dossier patient des proches), 128 (remplacement d'ordonnance)
 * et 129 (dates de visite d'un bilan), idempotentes.
 * Partagées entre les scripts apply-migration-119/121/122/126/128/129 et scripts/deploy-database-safety.php.
 */

function applyMigration119PatientAbsencesOpenEnd(PDO $pdo, string $migrationsDir): string
{
    $column = $pdo->query("SHOW COLUMNS FROM patient_absences LIKE 'end_date'")->fetch(PDO::FETCH_ASSOC);
    if ($column === false) {
        throw new RuntimeException('Colonne patient_absences.end_date absente : migration 096 requise avant la 119.');
    }
    if (strtoupper((string) ($column['Null'] ?? '')) === 'YES') {
        return 'Migration 119 verified: patient_absences.end_date nullable.';
    }
    if (strtolower((string) ($column['Type'] ?? '')) !== 'date') {
        throw new RuntimeException("Type end_date inattendu ({$column['Type']}) : migration 119 annulée.");
    }
    $pdo->exec(readMigrationSql($migrationsDir, '119_patient_absences_open_end.sql'));

    return 'Migration 119 applied: patient_absences.end_date nullable.';
}

function applyMigration121PatientPhones(PDO $pdo, string $migrationsDir): string
{
    $pdo->exec(readMigrationSql($migrationsDir, '121_patient_phones.sql'));
    $columns = $pdo->query('SHOW COLUMNS FROM patient_phones')->fetchAll(PDO::FETCH_COLUMN);
    $expected = ['id', 'patient_id', 'label', 'phone_encrypted', 'phone_dek', 'created_by', 'created_at'];
    if ($columns !== $expected) {
        throw new RuntimeException('Schéma patient_phones inattendu : ' . implode(', ', $columns));
    }

    return 'Migration 121 verified: patient_phones present.';
}

function applyMigration122PatientTransmissions(PDO $pdo, string $migrationsDir): string
{
    $pdo->exec(readMigrationSql($migrationsDir, '122_patient_transmissions.sql'));
    $columns = $pdo->query('SHOW COLUMNS FROM patient_transmissions')->fetchAll(PDO::FETCH_COLUMN);
    $expected = [
        'id', 'patient_id', 'author_id', 'author_role', 'occurred_on', 'body_encrypted', 'body_dek',
        'care_item_ids', 'appointment_id', 'for_doctor', 'created_at', 'edited_at',
    ];
    if ($columns !== $expected) {
        throw new RuntimeException('Schéma patient_transmissions inattendu : ' . implode(', ', $columns));
    }

    return 'Migration 122 verified: patient_transmissions present.';
}

/**
 * Le backfill (scripts/backfill-relative-profiles.php --apply) doit suivre : il crée les profils des proches existants.
 */
function applyMigration126PatientRelativesProfile(PDO $pdo, string $migrationsDir): string
{
    $sql = readMigrationSql($migrationsDir, '126_patient_relatives_profile.sql');
    $applied = $pdo->query("SHOW COLUMNS FROM patient_relatives LIKE 'profile_id'")->fetch(PDO::FETCH_ASSOC) === false;
    if ($applied) {
        $pdo->exec($sql);
    }
    $column = $pdo->query("SHOW COLUMNS FROM patient_relatives LIKE 'profile_id'")->fetch(PDO::FETCH_ASSOC);
    $unique = $pdo->query("SHOW INDEX FROM patient_relatives WHERE Key_name = 'uq_patient_relatives_profile'")->fetch(PDO::FETCH_ASSOC);
    $foreignKey = $pdo->query("
        SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'patient_relatives'
          AND CONSTRAINT_NAME = 'fk_patient_relatives_profile'
    ")->fetchColumn();
    if ($column === false || strtoupper((string) $column['Null']) !== 'YES' || $unique === false || $foreignKey !== 'SET NULL') {
        throw new RuntimeException('Migration 126 partiellement appliquée (patient_relatives.profile_id) : correction manuelle requise.');
    }

    return $applied
        ? 'Migration 126 applied: patient_relatives.profile_id.'
        : 'Migration 126 verified: patient_relatives.profile_id present.';
}

function applyMigration128MedicalDocumentsReplacement(PDO $pdo, string $migrationsDir): string
{
    $sql = readMigrationSql($migrationsDir, '128_medical_documents_replacement.sql');
    $applied = $pdo->query("SHOW COLUMNS FROM medical_documents LIKE 'replaced_by_document_id'")->fetch(PDO::FETCH_ASSOC) === false;
    if ($applied) {
        $pdo->exec($sql);
    }
    $columns = $pdo->query("
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'medical_documents'
          AND COLUMN_NAME IN ('replaced_by_document_id', 'replaced_at', 'replaced_by_user_id')
    ")->fetchAll(PDO::FETCH_COLUMN);
    $foreignKey = $pdo->query("
        SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'medical_documents'
          AND CONSTRAINT_NAME = 'fk_medical_documents_replaced_by'
    ")->fetchColumn();
    if (count($columns) !== 3 || $foreignKey !== 'SET NULL') {
        throw new RuntimeException('Migration 128 partiellement appliquée (medical_documents.replaced_*) : correction manuelle requise.');
    }

    return $applied
        ? 'Migration 128 applied: medical_documents.replaced_*.'
        : 'Migration 128 verified: medical_documents.replaced_* present.';
}

function applyMigration129AppointmentsVisitDates(PDO $pdo, string $migrationsDir): string
{
    $column = $pdo->query("SHOW COLUMNS FROM appointments LIKE 'visit_dates'")->fetch(PDO::FETCH_ASSOC);
    if ($column !== false) {
        return 'Migration 129 verified: appointments.visit_dates present.';
    }
    $pdo->exec(readMigrationSql($migrationsDir, '129_appointments_visit_dates.sql'));
    $column = $pdo->query("SHOW COLUMNS FROM appointments LIKE 'visit_dates'")->fetch(PDO::FETCH_ASSOC);
    if ($column === false || strtoupper((string) ($column['Null'] ?? '')) !== 'YES') {
        throw new RuntimeException('Migration 129 non appliquée : appointments.visit_dates absente.');
    }

    return 'Migration 129 applied: appointments.visit_dates.';
}
