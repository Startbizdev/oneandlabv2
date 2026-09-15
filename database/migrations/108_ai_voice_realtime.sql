-- Migration 108 : métadonnées voix temps réel (xAI Speech-to-Speech)

ALTER TABLE voice_sessions
    ADD COLUMN transport ENUM('rest', 'realtime') NOT NULL DEFAULT 'rest' AFTER channel,
    ADD COLUMN xai_conversation_id VARCHAR(128) NULL AFTER ai_conversation_id,
    ADD COLUMN token_expires_at DATETIME NULL AFTER ended_at,
    ADD COLUMN last_event_id VARCHAR(128) NULL AFTER token_expires_at;

CREATE TABLE IF NOT EXISTS voice_realtime_events (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload_json JSON NULL,
    latency_ms INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_voice_rt_event (session_id, event_id),
    KEY idx_voice_rt_session (session_id, created_at),
    CONSTRAINT fk_voice_rt_session FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
