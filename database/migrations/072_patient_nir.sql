-- Migration 072 : numéro de sécurité sociale (NIR) patient — chiffré

ALTER TABLE profiles
    ADD COLUMN nir_encrypted MEDIUMBLOB NULL COMMENT 'NIR patient (chiffré)' AFTER birth_date_dek,
    ADD COLUMN nir_dek VARBINARY(512) NULL AFTER nir_encrypted;
