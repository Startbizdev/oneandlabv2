-- Migration 130 : nouvel assistant Cary (conversations et messages chiffrés) et suppression de l'ancien assistant IA.
-- DESTRUCTIF (voulu) : supprime les tables de l'ancien assistant (conversations, mémoire, rapports, voix, RAG) et
-- leurs paramètres plateforme. Aucune autre table n'est modifiée ; platform_settings est partagée et conservée.

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS voice_realtime_events;
DROP TABLE IF EXISTS voice_transcriptions;
DROP TABLE IF EXISTS voice_messages;
DROP TABLE IF EXISTS voice_sessions;
DROP TABLE IF EXISTS ai_feedback;
DROP TABLE IF EXISTS ai_conversation_attachments;
DROP TABLE IF EXISTS ai_booking_audits;
DROP TABLE IF EXISTS ai_patient_signals;
DROP TABLE IF EXISTS ai_reports;
DROP TABLE IF EXISTS ai_summaries;
DROP TABLE IF EXISTS ai_conversation_summaries;
DROP TABLE IF EXISTS ai_messages;
DROP TABLE IF EXISTS ai_appointment_drafts;
DROP TABLE IF EXISTS ai_audits;
DROP TABLE IF EXISTS ai_conversations;
DROP TABLE IF EXISTS ai_user_memory;
DROP TABLE IF EXISTS ai_medical_memory;
DROP TABLE IF EXISTS ai_trends;
DROP TABLE IF EXISTS ai_agent_runs;
DROP TABLE IF EXISTS ai_task_routing;
SET FOREIGN_KEY_CHECKS = 1;

DELETE FROM platform_settings WHERE setting_key IN ('ai_disclaimer_fr', 'ai_temperature');

CREATE TABLE IF NOT EXISTS assistant_conversations (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    context_type VARCHAR(20) NULL,
    context_id VARCHAR(64) NULL,
    title_encrypted TEXT NOT NULL,
    title_dek TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_assistant_conversations_user (user_id, updated_at),
    CONSTRAINT fk_assistant_conversations_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_assistant_conversations_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le message utilisateur et la réponse d'un même tour portent le client_message_id du client (unique par rôle).
CREATE TABLE IF NOT EXISTS assistant_messages (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content_encrypted MEDIUMTEXT NOT NULL,
    content_dek TEXT NOT NULL,
    actions_json JSON NULL,
    client_message_id CHAR(36) NULL,
    status ENUM('pending', 'done', 'error') NOT NULL DEFAULT 'done',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    model VARCHAR(64) NULL,
    input_tokens INT UNSIGNED NULL,
    output_tokens INT UNSIGNED NULL,
    latency_ms INT UNSIGNED NULL,
    UNIQUE KEY uniq_assistant_messages_client (conversation_id, role, client_message_id),
    KEY idx_assistant_messages_history (conversation_id, created_at),
    KEY idx_assistant_messages_client (client_message_id),
    CONSTRAINT fk_assistant_messages_conversation FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
