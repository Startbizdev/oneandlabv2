-- Migration 003 : Création de la table appointment_status_updates
-- Historique des changements de statut des rendez-vous

CREATE TABLE IF NOT EXISTS appointment_status_updates (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    actor_id CHAR(36) NOT NULL,
    actor_role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NOT NULL,
    note TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_actor_id (actor_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




