-- Migration 132 : archivage intermédiaire des dossiers patients (5 ans sans activité, registre RGPD).
-- archived_at NULL = dossier actif. Idempotente, sans modification des données existantes.

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'archived_at') = 0,
    'ALTER TABLE profiles ADD COLUMN archived_at DATETIME NULL',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND INDEX_NAME = 'idx_profiles_role_archived') = 0,
    'ALTER TABLE profiles ADD INDEX idx_profiles_role_archived (role, archived_at)',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
