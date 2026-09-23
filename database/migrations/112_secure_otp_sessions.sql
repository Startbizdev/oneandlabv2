-- Lie chaque vérification OTP à la session secrète remise au client et
-- bloque une session après cinq codes incorrects.

ALTER TABLE otp_sessions
    ADD COLUMN session_token_hash CHAR(64) NULL AFTER otp_hash,
    ADD COLUMN failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER session_token_hash,
    ADD UNIQUE INDEX idx_otp_session_token_hash (session_token_hash);

-- Les anciennes sessions n'ont jamais été liées à leur session_id et ne
-- doivent donc plus pouvoir être utilisées après le déploiement.
UPDATE otp_sessions
SET verified = TRUE
WHERE verified = FALSE;
