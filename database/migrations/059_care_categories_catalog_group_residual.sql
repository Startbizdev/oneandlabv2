-- 059 : rattrapage des lignes sans `catalog_group` après 058 (noms locaux / seed différents).
-- Les catégories infirmières non matchées par les UPDATE nommés de 058 restent NULL et étaient
-- toutes affichées comme un seul bloc côté UX. Cette étape est idempotente.
--
-- Après 058 :
--   mysql ... < database/migrations/059_care_categories_catalog_group_residual.sql

UPDATE care_categories
SET catalog_group = 'examens', updated_at = CURRENT_TIMESTAMP
WHERE type = 'blood_test'
  AND (catalog_group IS NULL OR TRIM(catalog_group) = '');

UPDATE care_categories
SET catalog_group = 'divers', updated_at = CURRENT_TIMESTAMP
WHERE type = 'nursing'
  AND (catalog_group IS NULL OR TRIM(catalog_group) = '');
