-- Migration 007 : Création de la table access_logs
-- Logs HDS pour conformité et traçabilité

CREATE TABLE IF NOT EXISTS access_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NULL,
    role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NULL,
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'view', 'delete', 'decrypt', 'incident'
    resource_type VARCHAR(100) NOT NULL, -- 'appointment', 'profile', etc.
    resource_id CHAR(36) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL, -- IPv6 support
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action (action),
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




