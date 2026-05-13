-- 058 : care_categories.catalog_group (filtre UX : soins, examens, suivi, hygiene, prevention, divers)
-- Script idempotent : réexécutable sans erreur.
--
-- Usage prod / local :
--   mysql ... < database/migrations/058_care_categories_catalog_group.sql
-- ou :
--   ./database/scripts/apply-care-categories-catalog-group.sh

SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'care_categories'
  AND COLUMN_NAME = 'catalog_group';

SET @sql = IF(@c = 0,
  'ALTER TABLE care_categories ADD COLUMN catalog_group VARCHAR(64) NULL DEFAULT NULL COMMENT ''Groupe affichage / filtre'' AFTER type',
  'SELECT ''058: colonne catalog_group déjà présente (skip ALTER).'' AS notice');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @ix FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'care_categories'
  AND INDEX_NAME = 'idx_catalog_group';

SET @sqlix = IF(@ix = 0,
  'CREATE INDEX idx_catalog_group ON care_categories (type, catalog_group)',
  'SELECT ''058: index idx_catalog_group déjà présent (skip).'' AS notice');
PREPARE stmtix FROM @sqlix;
EXECUTE stmtix;
DEALLOCATE PREPARE stmtix;

UPDATE care_categories SET catalog_group = 'examens', updated_at = CURRENT_TIMESTAMP WHERE type = 'blood_test';

UPDATE care_categories SET catalog_group = 'soins', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing' AND name IN (
  'Pansement-plaie', 'Injection', 'Perfusion', 'Retrait de points / agrafes', 'Soins respiratoires',
  'Sonde urinaire', 'Soins de stomie', 'Soins palliatifs', 'Traitement',
  'Pansement', 'Soins de plaies', 'Prélèvement', 'Soins post-opératoires', 'Pose de cathéter',
  'Prélèvement urinaire', 'Chimiothérapie à domicile', 'Injection sous-cutanée', 'Injection intramusculaire',
  'Pansement complexe', 'Soins de sonde'
);

UPDATE care_categories SET catalog_group = 'suivi', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing' AND name IN (
  'Surveillance constante', 'Suivi diabète', 'Suivi post-hospitalisation',
  'Surveillance', 'Mesure tension / glycémie', 'Garde / surveillance nuit', 'Rééducation'
);

UPDATE care_categories SET catalog_group = 'hygiene', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing' AND name IN (
  'Soins d''hygiène', 'Toilette / soins d''hygiène', 'Aide aux repas'
);

UPDATE care_categories SET catalog_group = 'prevention', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing' AND name IN (
  'Mon bilan prévention', 'Vaccination', 'Bilan de prévention'
);

UPDATE care_categories SET catalog_group = 'divers', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing' AND name IN (
  'Autre', 'Soins à la personne', 'Epilation laser'
);
