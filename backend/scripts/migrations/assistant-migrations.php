<?php

declare(strict_types=1);

require_once __DIR__ . '/lab-network-migrations.php';

/**
 * Migration 130 (nouvel assistant, suppression des tables de l'ancien assistant IA), idempotente.
 * Partagée entre scripts/apply-migration-130.php et scripts/deploy-database-safety.php.
 */

/** Tables de l'ancien assistant supprimées par la migration 130 (ordre de suppression). */
const MIGRATION_130_DROPPED_TABLES = [
    'voice_realtime_events', 'voice_transcriptions', 'voice_messages', 'voice_sessions', 'ai_feedback',
    'ai_conversation_attachments', 'ai_booking_audits', 'ai_patient_signals', 'ai_reports', 'ai_summaries',
    'ai_conversation_summaries', 'ai_messages', 'ai_appointment_drafts', 'ai_audits', 'ai_conversations',
    'ai_user_memory', 'ai_medical_memory', 'ai_trends', 'ai_agent_runs', 'ai_task_routing',
];

function applyMigration130AssistantRebuild(PDO $pdo, string $migrationsDir): string
{
    $state = static function () use ($pdo): array {
        $tables = $pdo->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')->fetchAll(PDO::FETCH_COLUMN);

        return [
            'legacy' => array_values(array_intersect(MIGRATION_130_DROPPED_TABLES, $tables)),
            'new' => array_values(array_intersect(['assistant_conversations', 'assistant_messages'], $tables)),
        ];
    };
    $before = $state();
    if ($before['legacy'] === [] && count($before['new']) === 2) {
        return 'Migration 130 verified: assistant_conversations, assistant_messages present; legacy AI tables absent.';
    }
    $pdo->exec(readMigrationSql($migrationsDir, '130_assistant_rebuild.sql'));
    $after = $state();
    if ($after['legacy'] !== [] || count($after['new']) !== 2) {
        throw new RuntimeException('Migration 130 incomplète : ' . json_encode($after));
    }

    return 'Migration 130 applied: dropped ' . count($before['legacy']) . ' legacy AI tables; assistant tables created.';
}
