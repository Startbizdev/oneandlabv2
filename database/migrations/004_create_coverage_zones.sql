-- Migration 004 : Création de la table coverage_zones
-- Zones de couverture géographiques des professionnels

CREATE TABLE IF NOT EXISTS coverage_zones (
    id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    role ENUM('lab', 'subaccount', 'nurse') NOT NULL,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_km INT NOT NULL DEFAULT 10,
    zone_metadata JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_owner_id (owner_id),
    INDEX idx_role (role),
    INDEX idx_location (center_lat, center_lng),
    INDEX idx_active (is_active),
    
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




