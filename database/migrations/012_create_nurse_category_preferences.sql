-- Migration 012 : Création de la table nurse_category_preferences
-- Préférences des infirmiers pour les catégories de soins qu'ils acceptent

CREATE TABLE IF NOT EXISTS nurse_category_preferences (
    id CHAR(36) PRIMARY KEY,
    nurse_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_nurse_category (nurse_id, category_id),
    INDEX idx_nurse_id (nurse_id),
    INDEX idx_category_id (category_id),
    INDEX idx_enabled (is_enabled),
    
    FOREIGN KEY (nurse_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES care_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




