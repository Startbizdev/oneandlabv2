-- Migration 076 : conversations et messages IA

CREATE TABLE IF NOT EXISTS ai_conversations (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    conversation_type ENUM(
        'general','assistant_health','lab_results','medical_document',
        'appointment','health_tracking','professional','voice'
    ) NOT NULL DEFAULT 'general',
    channel ENUM('text','voice') NOT NULL DEFAULT 'text',
    custom_title VARCHAR(255) NULL,
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    system_key VARCHAR(64) NULL,
    archived_at DATETIME NULL,
    deleted_at DATETIME NULL,
    last_message_at DATETIME NULL,
    message_count INT UNSIGNED NOT NULL DEFAULT 0,
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_conv_user (user_id),
    KEY idx_ai_conv_patient (patient_id),
    KEY idx_ai_conv_system (user_id, system_key),
    KEY idx_ai_conv_updated (updated_at),
    CONSTRAINT fk_ai_conv_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_conv_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_messages (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    role ENUM('user','assistant','system') NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_msg_conv (conversation_id, created_at),
    CONSTRAINT fk_ai_msg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
