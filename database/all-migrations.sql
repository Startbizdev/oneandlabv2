-- ============================================================================
-- SCRIPT DE MIGRATION COMPLÈTE - ONEANDLAB V2
-- ============================================================================
-- Ce fichier contient toutes les migrations dans l'ordre
-- À exécuter dans phpMyAdmin ou via MySQL CLI
-- ============================================================================

-- Créer la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS `oneandlab` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `oneandlab`;

-- ============================================================================
-- Migration 001 : Création de la table profiles
-- ============================================================================
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

-- ============================================================================
-- Migration 002 : Création de la table appointments
-- ============================================================================
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

-- ============================================================================
-- Migration 003 : Création de la table appointment_status_updates
-- ============================================================================
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

-- ============================================================================
-- Migration 004 : Création de la table coverage_zones
-- ============================================================================
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

-- ============================================================================
-- Migration 005 : Création de la table care_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS care_categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    type ENUM('blood_test', 'nursing') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 006 : Création de la table reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    reviewee_id CHAR(36) NOT NULL, -- Professionnel noté
    reviewee_type ENUM('nurse', 'subaccount', 'lab') NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    response TEXT NULL, -- Réponse du professionnel
    response_at DATETIME NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    moderation_note TEXT NULL,
    moderated_by CHAR(36) NULL,
    moderated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_reviewee_id (reviewee_id),
    INDEX idx_visible (is_visible),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewee_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (moderated_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 007 : Création de la table access_logs
-- ============================================================================
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

-- ============================================================================
-- Migration 008 : Création de la table otp_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL, -- Hash bcrypt du code OTP
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_verified (verified),
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 009 : Création de la table notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_read (read_at),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 010 : Création de la table availability_settings
-- ============================================================================
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

-- ============================================================================
-- Migration 011 : Création de la table medical_documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_documents (
    id CHAR(36) PRIMARY KEY,
    appointment_id CHAR(36) NOT NULL,
    uploaded_by CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Chemin sur le serveur
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    encrypted BOOLEAN DEFAULT TRUE,
    file_dek TEXT NULL, -- Clé de chiffrement du fichier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_uploaded_by (uploaded_by),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 012 : Création de la table nurse_category_preferences
-- ============================================================================
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

-- ============================================================================
-- Migration 013 : Création de la table patient_relatives
-- ============================================================================
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

-- ============================================================================
-- Migration 014 : Ajouter la référence aux proches dans les rendez-vous
-- ============================================================================
-- Vérifier si la colonne existe avant de l'ajouter
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'relative_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE appointments ADD COLUMN relative_id CHAR(36) NULL AFTER patient_id',
    'SELECT "Column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajouter l'index si la colonne existe (réinitialiser @col_exists après l'ALTER)
SET @col_exists_after = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'relative_id'
);

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND INDEX_NAME = 'idx_relative_id'
);

SET @sql = IF(@index_exists = 0 AND @col_exists_after > 0,
    'ALTER TABLE appointments ADD INDEX idx_relative_id (relative_id)',
    'SELECT "Index already exists or column does not exist"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajouter la clé étrangère si elle n'existe pas déjà
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND CONSTRAINT_NAME = 'appointments_ibfk_6'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE appointments ADD FOREIGN KEY (relative_id) REFERENCES patient_relatives(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Seeds : Données initiales
-- ============================================================================

-- Catégories de soins infirmiers
INSERT INTO care_categories (id, name, description, type, is_active) VALUES
(UUID(), 'Pansement', 'Pansements simples et complexes', 'nursing', TRUE),
(UUID(), 'Injection', 'Injections intramusculaires, sous-cutanées', 'nursing', TRUE),
(UUID(), 'Prélèvement', 'Prélèvements sanguins, urinaires', 'nursing', TRUE),
(UUID(), 'Perfusion', 'Pose et surveillance de perfusions', 'nursing', TRUE),
(UUID(), 'Soins de plaies', 'Soins de plaies chroniques ou aiguës', 'nursing', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Catégories de prises de sang
INSERT INTO care_categories (id, name, description, type, is_active) VALUES
(UUID(), 'Bilan complet', 'Bilan sanguin complet', 'blood_test', TRUE),
(UUID(), 'Glycémie', 'Dosage de la glycémie', 'blood_test', TRUE),
(UUID(), 'Cholestérol', 'Dosage du cholestérol', 'blood_test', TRUE),
(UUID(), 'Vitamines', 'Dosage des vitamines', 'blood_test', TRUE),
(UUID(), 'Hormones', 'Dosage hormonal', 'blood_test', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- ============================================================================
-- Migration 015 : Création de la table patient_documents
-- ============================================================================
-- Documents médicaux stockés dans le profil patient (carte vitale, mutuelle, assurance)
-- L'ordonnance n'est PAS stockée ici car elle change à chaque rendez-vous

CREATE TABLE IF NOT EXISTS patient_documents (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    document_type ENUM('carte_vitale', 'carte_mutuelle', 'autres_assurances') NOT NULL,
    medical_document_id CHAR(36) NOT NULL, -- Référence vers medical_documents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_patient_document_type (patient_id, document_type),
    INDEX idx_patient_id (patient_id),
    INDEX idx_document_type (document_type),
    INDEX idx_medical_document_id (medical_document_id),
    
    FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 020 : lab_id pour subaccounts et preleveurs (lien laboratoire)
-- ============================================================================
ALTER TABLE profiles ADD COLUMN lab_id CHAR(36) NULL AFTER role;
ALTER TABLE profiles ADD INDEX idx_lab_id (lab_id);
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_lab FOREIGN KEY (lab_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================================
-- Migration 021 : Icône Lucide pour les catégories de soins
-- ============================================================================
ALTER TABLE care_categories
ADD COLUMN icon VARCHAR(120) NULL DEFAULT NULL AFTER type;

-- ============================================================================
-- Migration 037 : created_by sur profiles (patients créés par le pro)
-- ============================================================================
ALTER TABLE profiles
ADD COLUMN created_by CHAR(36) NULL AFTER role,
ADD INDEX idx_profiles_created_by (created_by),
ADD CONSTRAINT fk_profiles_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- Migration 045 : Ajout du statut 'planned' (planifié) aux appointments
-- ============================================================================
ALTER TABLE appointments
MODIFY COLUMN status ENUM(
    'pending',
    'confirmed',
    'planned',
    'inProgress',
    'completed',
    'canceled',
    'expired',
    'refused'
) NOT NULL DEFAULT 'pending';

-- ============================================================================
-- Migration 047 : patient_professional_access
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_professional_access (
    id CHAR(36) NOT NULL PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    professional_id CHAR(36) NOT NULL,
    source ENUM('created', 'appointment_accepted', 'appointment_linked', 'manual_link') NOT NULL DEFAULT 'created',
    appointment_id CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ppa_patient_professional (patient_id, professional_id),
    KEY idx_ppa_professional (professional_id),
    KEY idx_ppa_patient (patient_id),
    CONSTRAINT fk_ppa_patient FOREIGN KEY (patient_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ppa_professional FOREIGN KEY (professional_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ppa_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 050 : Galerie photos de soins (care_photo) + commentaires
-- ============================================================================
ALTER TABLE medical_documents
MODIFY COLUMN document_type ENUM(
    'carte_vitale',
    'carte_mutuelle',
    'ordonnance',
    'autres_assurances',
    'resultats',
    'care_photo',
    'other'
) DEFAULT 'other';

CREATE TABLE IF NOT EXISTS appointment_care_photo_comments (
    id CHAR(36) PRIMARY KEY,
    medical_document_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_medical_document_id (medical_document_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (medical_document_id) REFERENCES medical_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 051 : unicité email_hash (OTP / login)
-- Prérequis : php backend/scripts/run-migration-051-fix-duplicate-email-hash.php
-- ============================================================================
ALTER TABLE profiles
    DROP INDEX idx_email_hash,
    ADD UNIQUE INDEX uq_profiles_email_hash (email_hash);

-- ============================================================================
-- Migration 066 : tokens Expo Push (mobile Cary)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_device_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android') NOT NULL DEFAULT 'ios',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_expo_push_token (expo_push_token),
    INDEX idx_push_user_id (user_id),

    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 073 : QR codes professionnels + analytics + attribution RDV
-- ============================================================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    profile_id CHAR(36) NOT NULL,
    user_role ENUM('nurse', 'lab', 'subaccount', 'pro') NOT NULL,
    token VARCHAR(12) NOT NULL,
    redirect_url VARCHAR(512) NOT NULL,
    marketing_tagline VARCHAR(120) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_qr_codes_profile (profile_id),
    UNIQUE KEY uq_qr_codes_token (token),
    KEY idx_qr_codes_role (user_role),
    CONSTRAINT fk_qr_codes_profile FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_scans (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(512) NULL,
    ip_hash CHAR(64) NULL,
    referrer VARCHAR(512) NULL,
    KEY idx_qr_scans_code (qr_code_id),
    KEY idx_qr_scans_at (scanned_at),
    CONSTRAINT fk_qr_scans_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_visits (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    scan_id CHAR(36) NULL,
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(64) NULL,
    KEY idx_qr_visits_code (qr_code_id),
    KEY idx_qr_visits_at (visited_at),
    CONSTRAINT fk_qr_visits_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_visits_scan FOREIGN KEY (scan_id) REFERENCES qr_scans (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_conversions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    qr_code_id CHAR(36) NOT NULL,
    visit_id CHAR(36) NULL,
    appointment_id CHAR(36) NOT NULL,
    converted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_qr_conv_appointment (appointment_id),
    KEY idx_qr_conv_code (qr_code_id),
    CONSTRAINT fk_qr_conv_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_conv_visit FOREIGN KEY (visit_id) REFERENCES qr_visits (id) ON DELETE SET NULL,
    CONSTRAINT fk_qr_conv_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
    ADD COLUMN attribution_qr_id CHAR(36) NULL AFTER assigned_to,
    ADD COLUMN assigned_pro_id CHAR(36) NULL AFTER attribution_qr_id,
    ADD KEY idx_appointments_attribution_qr (attribution_qr_id),
    ADD KEY idx_appointments_assigned_pro (assigned_pro_id),
    ADD CONSTRAINT fk_appointments_attribution_qr FOREIGN KEY (attribution_qr_id) REFERENCES qr_codes (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_appointments_assigned_pro FOREIGN KEY (assigned_pro_id) REFERENCES profiles (id) ON DELETE SET NULL;

ALTER TABLE patient_professional_access
    MODIFY COLUMN source ENUM('created', 'appointment_accepted', 'appointment_linked', 'manual_link', 'qr_booking') NOT NULL DEFAULT 'created';

-- ============================================================================
-- Migration 075 : routing IA + paramètres plateforme
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('ai_disclaimer_fr', 'Cary est un assistant informatif. Il ne remplace pas un avis médical. En cas d''urgence, contactez le 15 ou le 112.'),
    ('ai_temperature', '0.4')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS ai_task_routing (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_type VARCHAR(64) NOT NULL,
    provider ENUM('grok','deepseek','openai','claude','gemini','local') NOT NULL DEFAULT 'grok',
    model VARCHAR(64) NULL,
    priority INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_ai_task_routing_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ai_task_routing (task_type, provider, model, priority, enabled) VALUES
    ('chat_simple', 'grok', 'grok-3', 0, 1),
    ('chat_complex', 'grok', 'grok-3', 0, 1),
    ('medical_summary', 'grok', 'grok-3', 0, 1),
    ('document_analysis', 'grok', 'grok-3', 0, 1),
    ('ocr', 'grok', 'grok-3', 0, 1),
    ('voice_agent', 'grok', 'grok-3', 0, 1),
    ('voice_transcription', 'grok', 'grok-3', 0, 1),
    ('trend_wording', 'grok', 'grok-3', 0, 1),
    ('appointment_suggestion', 'grok', 'grok-3', 0, 1)
ON DUPLICATE KEY UPDATE provider = VALUES(provider), model = VALUES(model), enabled = VALUES(enabled);

-- ============================================================================
-- Migration 076 : conversations et messages IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    conversation_type ENUM(
        'general','assistant_health','lab_results','medical_document',
        'appointment','health_tracking','professional','voice'
    ) NOT NULL DEFAULT 'general',
    channel ENUM('text','voice') NOT NULL DEFAULT 'text',
    custom_title VARCHAR(255) NULL,
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    system_key VARCHAR(64) NULL,
    archived_at DATETIME NULL,
    deleted_at DATETIME NULL,
    last_message_at DATETIME NULL,
    message_count INT UNSIGNED NOT NULL DEFAULT 0,
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_conv_user (user_id),
    KEY idx_ai_conv_patient (patient_id),
    KEY idx_ai_conv_system (user_id, system_key),
    KEY idx_ai_conv_updated (updated_at),
    CONSTRAINT fk_ai_conv_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_conv_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_messages (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    role ENUM('user','assistant','system') NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_msg_conv (conversation_id, created_at),
    CONSTRAINT fk_ai_msg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 077 : audits IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_audits (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NULL,
    patient_id CHAR(36) NULL,
    conversation_id CHAR(36) NULL,
    task_type VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(64) NULL,
    prompt_hash CHAR(64) NULL,
    latency_ms INT UNSIGNED NULL,
    tokens_input INT UNSIGNED NULL,
    tokens_output INT UNSIGNED NULL,
    error_message VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_audits_user (user_id, created_at),
    KEY idx_ai_audits_conv (conversation_id),
    CONSTRAINT fk_ai_audits_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_audits_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    summary_text TEXT NOT NULL,
    covers_message_id_until CHAR(36) NULL,
    token_count_estimate INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_conv_sum_conv (conversation_id, created_at),
    CONSTRAINT fk_ai_conv_sum_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Migration 078 : brouillons RDV assistés par IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_appointment_drafts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NULL,
    conversation_id CHAR(36) NULL,
    status ENUM('collecting','ready','confirmed','expired','cancelled') NOT NULL DEFAULT 'collecting',
    payload_json JSON NOT NULL,
    missing_fields_json JSON NULL,
    created_by_role VARCHAR(32) NOT NULL,
    appointment_id CHAR(36) NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ai_draft_user (user_id, status),
    KEY idx_ai_draft_conv (conversation_id),
    CONSTRAINT fk_ai_draft_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_draft_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_draft_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_booking_audits (
    id CHAR(36) PRIMARY KEY,
    draft_id CHAR(36) NOT NULL,
    action ENUM('create','patch','confirm','cancel') NOT NULL,
    user_id CHAR(36) NOT NULL,
    appointment_id CHAR(36) NULL,
    ai_audit_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_booking_audit_draft (draft_id),
    CONSTRAINT fk_ai_booking_audit_draft FOREIGN KEY (draft_id) REFERENCES ai_appointment_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_booking_audit_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FIN DES MIGRATIONS
-- ============================================================================
-- Pour créer les utilisateurs de test avec chiffrement, exécutez :
-- php backend/setup-database.php
-- ou visitez : http://localhost:8888/backend/setup-database.php
-- ============================================================================

