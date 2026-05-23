-- Migration 066 : tokens Expo Push (mobile Cary)
-- Stocke les ExponentPushToken[] par utilisateur pour les notifications système.

CREATE TABLE IF NOT EXISTS push_device_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL DEFAULT 'ios',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_expo_push_token (expo_push_token),
    INDEX idx_push_user_id (user_id),

    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
