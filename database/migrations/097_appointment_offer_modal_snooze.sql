-- Migration 097 : Snooze modal offres RDV (lab / sub / infirmier / préleveur)
-- « Plus tard » ou fermeture sans accepter : masquer la popup jusqu'à modal_snoozed_until.

SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'appointment_offers'
      AND COLUMN_NAME = 'modal_snoozed_until'
  ) > 0,
  "SELECT 'Column modal_snoozed_until already exists.'",
  "ALTER TABLE appointment_offers ADD COLUMN modal_snoozed_until TIMESTAMP NULL DEFAULT NULL AFTER created_at"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'appointment_offers'
      AND COLUMN_NAME = 'modal_ack_at'
  ) > 0,
  "SELECT 'Column modal_ack_at already exists.'",
  "ALTER TABLE appointment_offers ADD COLUMN modal_ack_at TIMESTAMP NULL DEFAULT NULL AFTER modal_snoozed_until"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'appointment_offers'
      AND INDEX_NAME = 'idx_offer_modal_snooze'
  ) > 0,
  "SELECT 'Index idx_offer_modal_snooze already exists.'",
  "ALTER TABLE appointment_offers ADD INDEX idx_offer_modal_snooze (profile_id, modal_snoozed_until)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
