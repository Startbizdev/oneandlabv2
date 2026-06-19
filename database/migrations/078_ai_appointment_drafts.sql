-- Migration 078 : brouillons RDV assistés par IA

CREATE TABLE IF NOT EXISTS ai_appointment_drafts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    conversation_id CHAR(36) NULL,
    status ENUM('collecting','ready','confirmed','expired','cancelled') NOT NULL DEFAULT 'collecting',
    payload_json JSON NOT NULL,
    missing_fields_json JSON NULL,
    created_by_role VARCHAR(32) NOT NULL,
    appointment_id CHAR(36) NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_draft_user (user_id, status),
    KEY idx_ai_draft_conv (conversation_id),
    CONSTRAINT fk_ai_draft_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_draft_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_draft_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_booking_audits (
    id CHAR(36) PRIMARY KEY,
    draft_id CHAR(36) NOT NULL,
    action ENUM('create','patch','confirm','cancel') NOT NULL,
    user_id CHAR(36) NOT NULL,
    appointment_id CHAR(36) NULL,
    ai_audit_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_booking_audit_draft (draft_id),
    CONSTRAINT fk_ai_booking_audit_draft FOREIGN KEY (draft_id) REFERENCES ai_appointment_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_booking_audit_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
