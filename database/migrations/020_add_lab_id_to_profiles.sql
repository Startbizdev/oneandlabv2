-- Migration 020 : Ajout de lab_id pour lier subaccounts et preleveurs au laboratoire
-- Conformité HDS : traçabilité de la hiérarchie laboratoire > sous-comptes/préleveurs

USE `oneandlab`;

ALTER TABLE profiles
ADD COLUMN lab_id CHAR(36) NULL AFTER role,
ADD INDEX idx_lab_id (lab_id),
ADD CONSTRAINT fk_profiles_lab FOREIGN KEY (lab_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- lab_id doit être défini uniquement pour subaccount et preleveur
-- Les valeurs existantes restent NULL (rétrocompatibilité)
