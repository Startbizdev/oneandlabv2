-- Migration 002 : Création de la table appointments
-- Gestion des rendez-vous (prises de sang et soins infirmiers)

CREATE TABLE IF NOT EXISTS appointments (
    id CHAR(36) PRIMARY KEY,
    type ENUM('blood_test', 'nursing') NOT NULL,
    status ENUM('pending', 'confirmed', 'inProgress', 'completed', 'canceled', 'expired', 'refused') NOT NULL DEFAULT 'pending',
    
    -- Relations
    patient_id CHAR(36) NULL, -- NULL pour les guests
    assigned_to CHAR(36) NULL, -- Professionnel assigné (FK profiles.id)
    assigned_nurse_id CHAR(36) NULL, -- Infirmier assigné (FK profiles.id)
    assigned_lab_id CHAR(36) NULL, -- Labo assigné (FK profiles.id)
    created_by CHAR(36) NOT NULL, -- Qui a créé le RDV (FK profiles.id)
    created_by_role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NOT NULL,
    
    -- Catégorie de soin
    category_id CHAR(36) NULL, -- FK care_categories.id
    form_type ENUM('nursing', 'blood_test') NOT NULL,
    
    -- Géolocalisation
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    
    -- Données chiffrées
    address_encrypted TEXT NOT NULL,
    address_dek TEXT NOT NULL,
    
    form_data_encrypted TEXT NULL, -- JSON chiffré avec données du formulaire
    form_data_dek TEXT NULL,
    
    -- Mode guest
    guest_token VARCHAR(255) NULL, -- Token temporaire pour guests (hashé, expire 24h)
    guest_email_encrypted TEXT NULL, -- Email chiffré pour guests
    guest_email_dek TEXT NULL,
    
    -- Horaires
    scheduled_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    duration_minutes INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_assigned_nurse_id (assigned_nurse_id),
    INDEX idx_assigned_lab_id (assigned_lab_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_location (location_lat, location_lng),
    INDEX idx_guest_token (guest_token),
    
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_nurse_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_lab_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




