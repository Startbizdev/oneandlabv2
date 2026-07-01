-- Migration 084 : pièces jointes conversations IA (Phase 3)

CREATE TABLE IF NOT EXISTS ai_conversation_attachments (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    message_id CHAR(36) NULL,
    user_id CHAR(36) NOT NULL,
    medical_document_id CHAR(36) NULL,
    attachment_type ENUM('pdf', 'image', 'ordonnance', 'resultats', 'other') NOT NULL DEFAULT 'other',
    storage_key VARCHAR(512) NULL,
    mime_type VARCHAR(128) NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_attach_conv (conversation_id, created_at),
    KEY idx_ai_attach_doc (medical_document_id),
    CONSTRAINT fk_ai_attach_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_attach_msg FOREIGN KEY (message_id) REFERENCES ai_messages(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_attach_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_attach_doc FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
