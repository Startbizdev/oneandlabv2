-- Migration 039 : Rendre appointment_id nullable dans medical_documents
-- Les documents de profil (Carte Vitale, Carte Mutuelle, etc.) ne sont pas liés à un RDV.
-- Cela évite de créer un faux rendez-vous "Document de profil" à chaque upload.

ALTER TABLE medical_documents
MODIFY COLUMN appointment_id CHAR(36) NULL;
