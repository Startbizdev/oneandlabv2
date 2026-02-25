-- Migration 030 : Champs supplémentaires pour profils publics
-- Lab / sous-lab : site internet, horaires d'ouverture, réseaux sociaux
-- Infirmier : années d'expérience, diplômes et formations (multi-select)

SET @dbname = DATABASE();
SET @tablename = "profiles";

-- website_url
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'website_url') > 0,
  "SELECT 'Column website_url already exists.'",
  "ALTER TABLE profiles ADD COLUMN website_url VARCHAR(500) NULL AFTER is_public_profile_enabled"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- opening_hours
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'opening_hours') > 0,
  "SELECT 'Column opening_hours already exists.'",
  "ALTER TABLE profiles ADD COLUMN opening_hours JSON NULL AFTER website_url"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- social_links
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'social_links') > 0,
  "SELECT 'Column social_links already exists.'",
  "ALTER TABLE profiles ADD COLUMN social_links JSON NULL AFTER opening_hours"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- years_experience
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'years_experience') > 0,
  "SELECT 'Column years_experience already exists.'",
  "ALTER TABLE profiles ADD COLUMN years_experience VARCHAR(20) NULL AFTER social_links"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- nurse_qualifications
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'nurse_qualifications') > 0,
  "SELECT 'Column nurse_qualifications already exists.'",
  "ALTER TABLE profiles ADD COLUMN nurse_qualifications JSON NULL AFTER years_experience"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
