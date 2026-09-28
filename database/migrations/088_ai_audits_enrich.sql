-- Migration 088 : enrichissement audits IA (observabilité)
-- Idempotente et compatible MySQL 8.x + MariaDB (pas de ADD COLUMN IF NOT EXISTS, propre à MariaDB).

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_audits' AND COLUMN_NAME = 'tool_calls_count') = 0,
    'ALTER TABLE ai_audits ADD COLUMN tool_calls_count INT UNSIGNED NULL AFTER tokens_output',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_audits' AND COLUMN_NAME = 'request_id') = 0,
    'ALTER TABLE ai_audits ADD COLUMN request_id CHAR(36) NULL AFTER tool_calls_count',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ai_audits' AND INDEX_NAME = 'idx_ai_audits_request') = 0,
    'CREATE INDEX idx_ai_audits_request ON ai_audits (request_id)',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
