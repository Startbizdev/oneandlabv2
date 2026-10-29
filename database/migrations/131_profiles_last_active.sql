-- Migration 131 : dernière activité des comptes (durées de conservation RGPD).
-- last_active_at : mis à jour au plus une fois par jour à chaque requête authentifiée.
-- retention_warned_at : date de l'e-mail prévenant de la suppression pour inactivité (remis à NULL à la reconnexion).
-- Idempotente, sans suppression de données. Comptes existants : point de départ = dernière modification du profil.

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'last_active_at') = 0,
    'ALTER TABLE profiles ADD COLUMN last_active_at DATETIME NULL',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'retention_warned_at') = 0,
    'ALTER TABLE profiles ADD COLUMN retention_warned_at DATETIME NULL',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND INDEX_NAME = 'idx_profiles_role_last_active') = 0,
    'ALTER TABLE profiles ADD INDEX idx_profiles_role_last_active (role, last_active_at)',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- updated_at = updated_at : ne pas déclencher le ON UPDATE CURRENT_TIMESTAMP de profiles.updated_at.
UPDATE profiles
SET last_active_at = GREATEST(created_at, COALESCE(updated_at, created_at)), updated_at = updated_at
WHERE last_active_at IS NULL;
