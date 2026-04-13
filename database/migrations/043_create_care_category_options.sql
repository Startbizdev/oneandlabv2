-- Migration 043 : Sous-choix par catégorie de soin (type de plaie, type d'injection, etc.)
-- Permet de personnaliser chaque soin avec des options dynamiques (select, text, number)

CREATE TABLE IF NOT EXISTS care_category_options (
    id CHAR(36) PRIMARY KEY,
    care_category_id CHAR(36) NOT NULL,
    option_key VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type ENUM('select', 'text', 'number') NOT NULL DEFAULT 'select',
    options JSON NULL COMMENT 'Pour select: [{"value":"x","label":"X"}]',
    is_required BOOLEAN DEFAULT FALSE,
    sort_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_care_category_id (care_category_id),
    CONSTRAINT fk_care_category_options_category
        FOREIGN KEY (care_category_id) REFERENCES care_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
