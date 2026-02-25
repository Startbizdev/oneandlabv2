-- Migration 031 : Ajout du champ is_accepting_appointments pour les infirmiers
-- Permet aux infirmiers de désactiver la prise de rendez-vous depuis leur profil public

SET @dbname = DATABASE();
SET @tablename = "profiles";

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_accepting_appointments') > 0,
  "SELECT 'Column is_accepting_appointments already exists.'",
  "ALTER TABLE profiles ADD COLUMN is_accepting_appointments BOOLEAN NOT NULL DEFAULT TRUE AFTER is_public_profile_enabled"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
