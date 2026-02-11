-- Migration 023 : Demandes d'inscription (lab, pro, nurse) en attente de validation admin
-- Champs chiffrés (PII) comme profiles. status = pending | accepted | rejected

CREATE TABLE IF NOT EXISTS registration_requests (
    id CHAR(36) PRIMARY KEY,
    role ENUM('lab', 'pro', 'nurse') NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',

    email_hash VARCHAR(64) NOT NULL,
    email_encrypted TEXT NOT NULL,
    email_dek TEXT NOT NULL,

    first_name_encrypted TEXT NOT NULL,
    first_name_dek TEXT NOT NULL,
    last_name_encrypted TEXT NOT NULL,
    last_name_dek TEXT NOT NULL,

    phone_encrypted TEXT NULL,
    phone_dek TEXT NULL,
    address_encrypted TEXT NULL,
    address_dek TEXT NULL,

    siret_encrypted TEXT NULL,
    siret_dek TEXT NULL,
    adeli_encrypted TEXT NULL,
    adeli_dek TEXT NULL,
    rpps_encrypted TEXT NULL,
    rpps_dek TEXT NULL,
    company_name_encrypted TEXT NULL,
    company_name_dek TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    reviewed_by CHAR(36) NULL,

    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_email_hash (email_hash),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
