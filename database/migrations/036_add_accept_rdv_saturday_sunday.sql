-- Migration 036 : Accepter les RDV le samedi et le dimanche (lab / subaccount)
-- Par défaut TRUE pour ne pas changer le comportement actuel.

SET @dbname = DATABASE();
SET @tablename = "profiles";

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'accept_rdv_saturday') > 0,
  "SELECT 'Column accept_rdv_saturday already exists.'",
  "ALTER TABLE profiles ADD COLUMN accept_rdv_saturday BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Accepter les RDV le samedi' AFTER min_booking_lead_time_hours"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement2 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'accept_rdv_sunday') > 0,
  "SELECT 'Column accept_rdv_sunday already exists.'",
  "ALTER TABLE profiles ADD COLUMN accept_rdv_sunday BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Accepter les RDV le dimanche' AFTER accept_rdv_saturday"
));
PREPARE stmt2 FROM @preparedStatement2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
