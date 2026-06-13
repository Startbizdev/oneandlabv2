-- Migration 071 : signature manuscrite ordonnance (pro / infirmier)

ALTER TABLE profiles
    ADD COLUMN prescription_signature_encrypted MEDIUMBLOB NULL COMMENT 'PNG signature ordonnance (chiffré)' AFTER adeli_dek,
    ADD COLUMN prescription_signature_dek VARBINARY(512) NULL AFTER prescription_signature_encrypted;
