-- Migration 124 : messages Cary — ordre stable, idempotence des envois (client_message_id) et lien réponse → question

ALTER TABLE ai_messages
    ADD COLUMN seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT AFTER id,
    ADD COLUMN client_message_id CHAR(36) NULL AFTER conversation_id,
    ADD COLUMN reply_to_message_id CHAR(36) NULL AFTER client_message_id,
    ADD UNIQUE KEY uniq_ai_msg_seq (seq),
    ADD UNIQUE KEY uniq_ai_msg_client (conversation_id, client_message_id),
    ADD KEY idx_ai_msg_reply (reply_to_message_id);
