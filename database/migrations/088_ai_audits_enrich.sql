-- Migration 088 : enrichissement audits IA (observabilité)

ALTER TABLE ai_audits
    ADD COLUMN IF NOT EXISTS tool_calls_count INT UNSIGNED NULL AFTER tokens_output,
    ADD COLUMN IF NOT EXISTS request_id CHAR(36) NULL AFTER tool_calls_count;

CREATE INDEX IF NOT EXISTS idx_ai_audits_request ON ai_audits (request_id);
