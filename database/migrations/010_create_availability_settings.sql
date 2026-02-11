-- Migration 010 : Création de la table availability_settings
-- Horaires de disponibilité des professionnels

CREATE TABLE IF NOT EXISTS availability_settings (
    id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    role ENUM('lab', 'subaccount', 'nurse') NOT NULL,
    weekly_schedule JSON NOT NULL, -- Horaires hebdomadaires
    exceptions JSON NULL, -- Exceptions (vacances, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_owner_id (owner_id),
    
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




