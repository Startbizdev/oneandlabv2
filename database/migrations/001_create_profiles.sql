-- Migration 001 : Création de la table profiles
-- Table principale pour tous les utilisateurs (patients, professionnels, admins)

CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY,
    role ENUM('super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient') NOT NULL,
    
    -- Champs chiffrés avec DEK
    email_encrypted TEXT NOT NULL,
    email_dek TEXT NOT NULL,
    email_hash VARCHAR(64) NOT NULL, -- Hash SHA256 pour recherche sans déchiffrement
    
    first_name_encrypted TEXT NOT NULL,
    first_name_dek TEXT NOT NULL,
    
    last_name_encrypted TEXT NOT NULL,
    last_name_dek TEXT NOT NULL,
    
    phone_encrypted TEXT NULL,
    phone_dek TEXT NULL,
    
    address_encrypted TEXT NULL,
    address_dek TEXT NULL,
    
    gender_encrypted TEXT NULL,
    gender_dek TEXT NULL,
    
    birth_date_encrypted TEXT NULL,
    birth_date_dek TEXT NULL,
    
    -- Champs spécifiques professionnels
    rpps_encrypted TEXT NULL, -- Pour infirmiers
    rpps_dek TEXT NULL,
    
    siret_encrypted TEXT NULL, -- Pour labos
    siret_dek TEXT NULL,
    
    rcp_insurance_encrypted TEXT NULL, -- Assurance RC professionnelle
    rcp_insurance_dek TEXT NULL,
    
    -- MFA TOTP
    mfa_enabled BOOLEAN DEFAULT FALSE,
    totp_secret_encrypted TEXT NULL,
    totp_secret_dek TEXT NULL,
    
    -- Système d'incidents
    banned_until DATETIME NULL,
    incident_count INT DEFAULT 0,
    last_incident_at DATETIME NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_role (role),
    INDEX idx_email_hash (email_hash),
    INDEX idx_banned (banned_until),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




