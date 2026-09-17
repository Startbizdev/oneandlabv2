<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);

    return (int) $stmt->fetchColumn() > 0;
}

function indexExists(PDO $pdo, string $table, string $index): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?'
    );
    $stmt->execute([$table, $index]);

    return (int) $stmt->fetchColumn() > 0;
}

$table = 'ai_audits';

if (!columnExists($pdo, $table, 'tool_calls_count')) {
    $pdo->exec('ALTER TABLE ai_audits ADD COLUMN tool_calls_count INT UNSIGNED NULL AFTER tokens_output');
    echo "OK: colonne tool_calls_count\n";
} else {
    echo "SKIP: tool_calls_count déjà présente\n";
}

if (!columnExists($pdo, $table, 'request_id')) {
    $pdo->exec('ALTER TABLE ai_audits ADD COLUMN request_id CHAR(36) NULL AFTER tool_calls_count');
    echo "OK: colonne request_id\n";
} else {
    echo "SKIP: request_id déjà présente\n";
}

if (!indexExists($pdo, $table, 'idx_ai_audits_request')) {
    $pdo->exec('CREATE INDEX idx_ai_audits_request ON ai_audits (request_id)');
    echo "OK: index idx_ai_audits_request\n";
} else {
    echo "SKIP: index idx_ai_audits_request déjà présent\n";
}

echo "Migration 088_ai_audits_enrich terminée.\n";
