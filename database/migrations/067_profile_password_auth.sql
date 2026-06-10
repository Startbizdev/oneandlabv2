-- Migration 067 : Authentification par mot de passe (hybride OTP + password)

ALTER TABLE profiles
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email_hash,
  ADD COLUMN password_set_at DATETIME NULL AFTER password_hash,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_set_at;

CREATE INDEX idx_profiles_must_change_password ON profiles (must_change_password);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_by ENUM('self', 'admin') NOT NULL DEFAULT 'self',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_user (user_id, expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
