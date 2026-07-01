-- Migration 085 : sessions vocales IA (Phase 4)

CREATE TABLE IF NOT EXISTS voice_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    ai_conversation_id CHAR(36) NULL,
    locale ENUM('fr', 'en', 'ar', 'es') NOT NULL DEFAULT 'fr',
    channel ENUM('text', 'voice') NOT NULL DEFAULT 'voice',
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_voice_session_user (user_id, started_at),
    CONSTRAINT fk_voice_session_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_voice_session_conv FOREIGN KEY (ai_conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_messages (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    audio_storage_key VARCHAR(512) NULL,
    duration_ms INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_voice_msg_session (session_id, created_at),
    CONSTRAINT fk_voice_msg_session FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_transcriptions (
    id CHAR(36) PRIMARY KEY,
    voice_message_id CHAR(36) NOT NULL,
    text TEXT NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'client',
    confidence DECIMAL(5, 4) NULL,
    language_detected VARCHAR(8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_voice_transcription_msg (voice_message_id),
    CONSTRAINT fk_voice_trans_msg FOREIGN KEY (voice_message_id) REFERENCES voice_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
