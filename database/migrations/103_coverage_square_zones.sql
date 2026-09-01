-- Migration 103 : zones de couverture carrées (axis-aligned, demi-côté = radius_km)
-- Les bounds_json peuvent être recalculés côté app si NULL (legacy).

SET @dbname = DATABASE();
SET @tablename = 'coverage_zones';

-- zone_type
SET @columnname = 'zone_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname
  ) > 0,
  'SELECT 1',
  "ALTER TABLE coverage_zones ADD COLUMN zone_type ENUM('circle','square') NOT NULL DEFAULT 'square' AFTER role"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- bounds_json
SET @columnname = 'bounds_json';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE coverage_zones ADD COLUMN bounds_json JSON NULL AFTER radius_km'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Legacy : marquer toutes les zones existantes en carré (bounds recalculés à la lecture/sauvegarde)
UPDATE coverage_zones SET zone_type = 'square' WHERE zone_type IS NULL OR zone_type = 'circle' OR zone_type = '';
