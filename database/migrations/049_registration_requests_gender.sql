-- Prénom → genre pour les demandes d'inscription infirmier (stocké chiffré comme sur profiles)
ALTER TABLE registration_requests
  ADD COLUMN gender_encrypted TEXT NULL AFTER last_name_dek,
  ADD COLUMN gender_dek TEXT NULL AFTER gender_encrypted;
