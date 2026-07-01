-- Migration 087 : feedback utilisateur IA (Phase 4)

CREATE TABLE IF NOT EXISTS ai_feedback (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    conversation_id CHAR(36) NULL,
    message_id CHAR(36) NULL,
    rating TINYINT NOT NULL,
    comment VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_feedback_user (user_id, created_at),
    KEY idx_ai_feedback_rating (rating, created_at),
    CONSTRAINT fk_ai_feedback_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_feedback_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_feedback_msg FOREIGN KEY (message_id) REFERENCES ai_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
