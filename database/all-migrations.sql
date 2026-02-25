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
    reviewee_type ENUM('nurse', 'subaccount') NOT NULL,
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
-- FIN DES MIGRATIONS
-- ============================================================================
-- Pour créer les utilisateurs de test avec chiffrement, exécutez :
-- php backend/setup-database.php
-- ou visitez : http://localhost:8888/backend/setup-database.php
-- ============================================================================

