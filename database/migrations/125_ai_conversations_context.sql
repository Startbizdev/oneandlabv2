-- Migration 125 : conversation Cary rattachée à un objet (rendez-vous, résultat, patient), une seule par utilisateur et par objet

ALTER TABLE ai_conversations
    ADD COLUMN context_type VARCHAR(20) NULL AFTER conversation_type,
    ADD COLUMN context_id CHAR(36) NULL AFTER context_type,
    ADD UNIQUE KEY uniq_ai_conv_context (user_id, context_type, context_id);
