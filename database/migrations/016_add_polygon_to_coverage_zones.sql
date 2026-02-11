-- Migration 016 : Ajout du support des polygones pour les zones de couverture
-- Les infirmiers libéraux peuvent maintenant définir une zone de couverture avec un polygone

-- Vérifier et ajouter polygon_coordinates si elle n'existe pas
SET @dbname = DATABASE();
SET @tablename = 'coverage_zones';
SET @columnname = 'polygon_coordinates';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' JSON NULL COMMENT ''Coordonnées du polygone de couverture [[lat, lng], ...]''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Vérifier et ajouter zone_type si elle n'existe pas
SET @columnname = 'zone_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(''circle'', ''polygon'') DEFAULT ''circle'' COMMENT ''Type de zone : cercle ou polygone''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Mettre à jour les zones existantes pour qu'elles soient de type circle
UPDATE coverage_zones SET zone_type = 'circle' WHERE zone_type IS NULL;

-- Supprimer les doublons : garder uniquement la zone la plus récente pour chaque owner_id + role
DELETE cz1 FROM coverage_zones cz1
INNER JOIN coverage_zones cz2 
WHERE cz1.owner_id = cz2.owner_id 
  AND cz1.role = cz2.role
  AND cz1.created_at < cz2.created_at;
