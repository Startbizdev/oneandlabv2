-- Migration 024 : Nom d'entité (raison sociale) pour lab et sous-compte
ALTER TABLE profiles
ADD COLUMN company_name_encrypted TEXT NULL,
ADD COLUMN company_name_dek TEXT NULL;
