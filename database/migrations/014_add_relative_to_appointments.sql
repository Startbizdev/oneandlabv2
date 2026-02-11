-- Migration 014 : Ajouter la référence aux proches dans les rendez-vous
-- Permet aux patients de prendre des RDV pour leurs proches

ALTER TABLE appointments
ADD COLUMN relative_id CHAR(36) NULL AFTER patient_id,
ADD INDEX idx_relative_id (relative_id),
ADD FOREIGN KEY (relative_id) REFERENCES patient_relatives(id) ON DELETE SET NULL;



