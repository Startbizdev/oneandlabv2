-- Migration 032 : Table des tokens de partage RDV (soins infirmiers vers WhatsApp)
-- Un token par RDV permet d'accéder à une page marketing sans données patient

CREATE TABLE IF NOT EXISTS appointment_share_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    CONSTRAINT fk_share_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_share_token (token),
    INDEX idx_share_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
