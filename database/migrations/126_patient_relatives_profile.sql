-- Migration 126 : dossier patient propre à chaque proche (profil patient sans connexion)
-- profile_id : profil role=patient créé pour le proche ; carnet, constantes, téléphones et transmissions y sont rattachés.
-- Suppression du proche : le profil et ses données de santé sont conservés (SET NULL côté proche, rien n'est supprimé).
-- Après application : php scripts/backfill-relative-profiles.php --apply (crée les profils des proches existants).

ALTER TABLE patient_relatives
    ADD COLUMN profile_id CHAR(36) NULL AFTER patient_id,
    ADD UNIQUE KEY uq_patient_relatives_profile (profile_id),
    ADD CONSTRAINT fk_patient_relatives_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
