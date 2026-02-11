-- Migration 022 : Numéro Adeli pour les professionnels de santé (pro)
-- Adeli = 9 chiffres, enregistrement ARS (psychologues, etc.)

ALTER TABLE profiles
ADD COLUMN adeli_encrypted TEXT NULL AFTER siret_dek,
ADD COLUMN adeli_dek TEXT NULL AFTER adeli_encrypted;
