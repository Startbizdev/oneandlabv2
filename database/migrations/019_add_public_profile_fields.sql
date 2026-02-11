-- Migration 019 : Ajouter les champs pour les profils publics
-- Permet aux infirmiers et sous-labos d'avoir des profils publics avec slug, images, biographie, FAQ

-- Ajouter les colonnes si elles n'existent pas déjà
SET @dbname = DATABASE();
SET @tablename = "profiles";

-- public_slug
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "public_slug")
  ) > 0,
  "SELECT 'Column public_slug already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN public_slug VARCHAR(255) NULL UNIQUE AFTER role")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- profile_image_url
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "profile_image_url")
  ) > 0,
  "SELECT 'Column profile_image_url already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN profile_image_url VARCHAR(500) NULL AFTER public_slug")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- cover_image_url
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "cover_image_url")
  ) > 0,
  "SELECT 'Column cover_image_url already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN cover_image_url VARCHAR(500) NULL AFTER profile_image_url")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- biography
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "biography")
  ) > 0,
  "SELECT 'Column biography already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN biography TEXT NULL AFTER cover_image_url")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- faq
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "faq")
  ) > 0,
  "SELECT 'Column faq already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN faq JSON NULL AFTER biography")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- is_public_profile_enabled
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = "is_public_profile_enabled")
  ) > 0,
  "SELECT 'Column is_public_profile_enabled already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN is_public_profile_enabled BOOLEAN DEFAULT FALSE AFTER faq")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Index pour recherche rapide par slug (si n'existe pas déjà)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = "idx_public_slug")
  ) > 0,
  "SELECT 'Index idx_public_slug already exists.'",
  CONCAT("CREATE INDEX idx_public_slug ON ", @tablename, "(public_slug)")
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = "idx_public_profile_enabled")
  ) > 0,
  "SELECT 'Index idx_public_profile_enabled already exists.'",
  CONCAT("CREATE INDEX idx_public_profile_enabled ON ", @tablename, "(is_public_profile_enabled)")
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Le slug doit être unique et ne peut être défini que pour nurses et subaccounts
-- Cette contrainte sera gérée au niveau applicatif
