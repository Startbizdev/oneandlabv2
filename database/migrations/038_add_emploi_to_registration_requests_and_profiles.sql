-- Migration 038 : Emploi (profession de santé) pour les pros (hors infirmier)
-- registration_requests : champ en clair pour la demande
-- profiles : champ en clair pour le profil pro

ALTER TABLE registration_requests
ADD COLUMN emploi VARCHAR(120) NULL AFTER company_name_dek;

ALTER TABLE profiles
ADD COLUMN emploi VARCHAR(120) NULL AFTER adeli_dek;
