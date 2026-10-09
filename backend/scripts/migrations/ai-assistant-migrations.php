<?php

declare(strict_types=1);

require_once __DIR__ . '/lab-network-migrations.php';

/**
 * Migrations 124 (idempotence des messages Cary) et 125 (conversation par objet), idempotentes.
 * Partagées entre les scripts apply-migration-124/125 et scripts/deploy-database-safety.php.
 */

function applyMigration124AiMessagesIdempotence(PDO $pdo, string $migrationsDir): string
{
    $columns = $pdo->query('SHOW COLUMNS FROM ai_messages')->fetchAll(PDO::FETCH_COLUMN);
    $expected = ['seq', 'client_message_id', 'reply_to_message_id'];
    $present = array_values(array_intersect($expected, $columns));
    if ($present === $expected) {
        return 'Migration 124 verified: ai_messages.seq, client_message_id, reply_to_message_id present.';
    }
    if ($present !== []) {
        throw new RuntimeException('Migration 124 partiellement appliquée (' . implode(', ', $present) . ') : correction manuelle requise.');
    }
    $pdo->exec(readMigrationSql($migrationsDir, '124_ai_messages_idempotence.sql'));

    return 'Migration 124 applied: ai_messages.seq, client_message_id, reply_to_message_id.';
}

function applyMigration125AiConversationsContext(PDO $pdo, string $migrationsDir): string
{
    $columns = $pdo->query('SHOW COLUMNS FROM ai_conversations')->fetchAll(PDO::FETCH_COLUMN);
    $expected = ['context_type', 'context_id'];
    $present = array_values(array_intersect($expected, $columns));
    if ($present === $expected) {
        return 'Migration 125 verified: ai_conversations.context_type, context_id present.';
    }
    if ($present !== []) {
        throw new RuntimeException('Migration 125 partiellement appliquée (' . implode(', ', $present) . ') : correction manuelle requise.');
    }
    $pdo->exec(readMigrationSql($migrationsDir, '125_ai_conversations_context.sql'));

    return 'Migration 125 applied: ai_conversations.context_type, context_id.';
}
