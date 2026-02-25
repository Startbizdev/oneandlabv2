-- Migration 035 : Délai minimum de réservation (lab / subaccount)
-- Valeurs possibles : 0, 24, 48, 72 (heures). Défaut 48.

SET @dbname = DATABASE();
SET @tablename = "profiles";

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'min_booking_lead_time_hours') > 0,
  "SELECT 'Column min_booking_lead_time_hours already exists.'",
  "ALTER TABLE profiles ADD COLUMN min_booking_lead_time_hours SMALLINT NOT NULL DEFAULT 48 COMMENT 'Délai minimum en heures (0, 24, 48, 72) avant la date du RDV' AFTER is_accepting_appointments"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
