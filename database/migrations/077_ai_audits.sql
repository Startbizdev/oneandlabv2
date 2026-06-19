-- Migration 077 : audits IA et résumés conversation

CREATE TABLE IF NOT EXISTS ai_audits (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NULL,
    patient_id CHAR(36) NULL,
    conversation_id CHAR(36) NULL,
    task_type VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(64) NULL,
    prompt_hash CHAR(64) NULL,
    latency_ms INT UNSIGNED NULL,
    tokens_input INT UNSIGNED NULL,
    tokens_output INT UNSIGNED NULL,
    error_message VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_audits_user (user_id, created_at),
    KEY idx_ai_audits_conv (conversation_id),
    CONSTRAINT fk_ai_audits_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_audits_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    summary_text TEXT NOT NULL,
    covers_message_id_until CHAR(36) NULL,
    token_count_estimate INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_conv_sum_conv (conversation_id, created_at),
    CONSTRAINT fk_ai_conv_sum_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
