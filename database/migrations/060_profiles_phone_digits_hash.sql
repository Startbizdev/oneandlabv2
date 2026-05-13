-- Index de recherche patient par téléphone (hash des 10 chiffres FR normalisés) — évite déchiffrement complet de la base.
ALTER TABLE profiles
ADD COLUMN phone_digits_hash CHAR(64) NULL DEFAULT NULL COMMENT 'SHA256(fr|0XXXXXXXXX) pour lookup pro' AFTER phone_dek;

CREATE INDEX idx_profiles_phone_digits_hash_patient ON profiles (phone_digits_hash, role);
