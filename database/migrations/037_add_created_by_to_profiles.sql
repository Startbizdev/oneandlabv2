-- Migration 037 : Ajout de created_by sur profiles pour lier les patients au pro qui les a créés
-- Permet au pro de consulter/modifier uniquement ses patients

USE `oneandlab`;

ALTER TABLE profiles
ADD COLUMN created_by CHAR(36) NULL AFTER role,
ADD INDEX idx_profiles_created_by (created_by),
ADD CONSTRAINT fk_profiles_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
