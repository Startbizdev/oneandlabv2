-- Migration 104 : zones de couverture polygone (6 sommets)
-- Idempotent : ENUM déjà étendu si relancé.

SET @dbname = DATABASE();
SET @tablename = 'coverage_zones';
SET @columnname = 'zone_type';

SET @needAlter = (
  SELECT IF(
    (
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname
        AND table_name = @tablename
        AND column_name = @columnname
        AND COLUMN_TYPE LIKE '%polygon%'
    ) > 0,
    0,
    1
  )
);

SET @preparedStatement = IF(
  @needAlter = 1,
  "ALTER TABLE coverage_zones MODIFY COLUMN zone_type ENUM('circle','square','polygon') NOT NULL DEFAULT 'square'",
  'SELECT 1'
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;
