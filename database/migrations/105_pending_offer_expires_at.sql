-- Migration 105 : expiration offres pending (fenêtre soir → 6h Paris + 2h)

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'pending_offer_expires_at') > 0,
    'SELECT 1',
    'ALTER TABLE appointments ADD COLUMN pending_offer_expires_at DATETIME NULL DEFAULT NULL AFTER updated_at'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND INDEX_NAME = 'idx_appointments_pending_offer_expires_at') > 0,
    'SELECT 1',
    'CREATE INDEX idx_appointments_pending_offer_expires_at ON appointments (status, pending_offer_expires_at)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
