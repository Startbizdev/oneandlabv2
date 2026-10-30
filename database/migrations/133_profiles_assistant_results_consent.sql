-- Migration 133 : accord du patient pour que l'assistant lise lui-même ses comptes rendus d'analyses.
-- NULL = pas d'accord (l'assistant ne voit que la date et le type). Idempotente, sans modification des données.

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'assistant_results_consent_at') = 0,
    'ALTER TABLE profiles ADD COLUMN assistant_results_consent_at DATETIME NULL',
    'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
