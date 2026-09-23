-- Migration 111 : favoris pharmacies (v2)

CREATE TABLE IF NOT EXISTS pharmacy_favorites (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    pharmacy_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_pharmacy_favorites_user_pharmacy (user_id, pharmacy_id),
    INDEX idx_pharmacy_favorites_user (user_id, created_at),

    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
