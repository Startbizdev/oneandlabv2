-- Migration 013 : Création de la table patient_relatives
-- Table pour gérer les proches des patients

CREATE TABLE IF NOT EXISTS patient_relatives (
    id CHAR(36) PRIMARY KEY,

    -- Patient qui crée le proche
    patient_id CHAR(36) NOT NULL,

    -- Informations obligatoires
    first_name_encrypted TEXT NOT NULL,
    first_name_dek TEXT NOT NULL,

    last_name_encrypted TEXT NOT NULL,
    last_name_dek TEXT NOT NULL,

    relationship_type ENUM('child', 'parent', 'spouse', 'sibling', 'grandparent', 'grandchild', 'other') NOT NULL,

    -- Informations optionnelles (si non fournies, utiliser celles du patient)
    email_encrypted TEXT NULL,
    email_dek TEXT NULL,
    email_hash VARCHAR(64) NULL, -- Hash SHA256 pour recherche sans déchiffrement

    phone_encrypted TEXT NULL,
    phone_dek TEXT NULL,

    address_encrypted TEXT NULL,
    address_dek TEXT NULL,

    gender_encrypted TEXT NULL,
    gender_dek TEXT NULL,

    birth_date_encrypted TEXT NULL,
    birth_date_dek TEXT NULL,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Contraintes
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_email_hash (email_hash),
    INDEX idx_relationship_type (relationship_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



