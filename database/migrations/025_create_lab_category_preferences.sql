-- Migration 025 : Préférences des laboratoires pour les types de soins (catégories) proposés
CREATE TABLE IF NOT EXISTS lab_category_preferences (
    id CHAR(36) PRIMARY KEY,
    lab_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_lab_category (lab_id, category_id),
    INDEX idx_lab_id (lab_id),
    INDEX idx_category_id (category_id),
    INDEX idx_enabled (is_enabled),

    FOREIGN KEY (lab_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES care_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
